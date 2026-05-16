require "test_helper"
require "securerandom"

class ApiMessagesControllerTest < ActionDispatch::IntegrationTest
  setup do
    Message.delete_all
    User.delete_all

    suffix = SecureRandom.hex(4)
    @user = build_user(email: "chat-#{suffix}@example.com")
    @user.save!
    @other_user = build_user(email: "other-chat-#{suffix}@example.com")
    @other_user.save!
    @admin = build_user(email: "chat-admin-#{suffix}@example.com", role: "admin")
    @admin.save!
  end

  test "requires authentication" do
    get "/api/messages"

    assert_response :unauthorized
  end

  test "requires authentication for update and delete" do
    message = @user.messages.create!(body: "Protected")

    patch "/api/messages/#{message.id}", params: { body: "Changed" }
    assert_response :unauthorized
    assert_equal "Protected", message.reload.body

    delete "/api/messages/#{message.id}"
    assert_response :unauthorized
    assert Message.exists?(message.id)
  end

  test "authenticated user creates message" do
    post "/api/messages",
      params: { body: "Hello" },
      headers: auth_headers(@user)

    assert_response :created
    assert_equal "Hello", JSON.parse(response.body)["body"]
  end

  test "authenticated user lists messages" do
    @user.messages.create!(body: "Listed message")

    get "/api/messages", headers: auth_headers(@user)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal "Listed message", payload["items"].first["body"]
    assert_equal 1, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 1, payload["meta"]["total_count"]
    assert_equal 1, payload["meta"]["total_pages"]
    assert_includes payload["items"].first.keys, "updated_at"
    assert_includes payload["items"].first.keys, "edited"
    assert_includes payload["items"].first.keys, "can_edit"
    assert_includes payload["items"].first.keys, "can_delete"
  end

  test "messages index is paginated with fixed metadata" do
    11.times do |index|
      @user.messages.create!(body: "Paged message #{index}")
    end

    get "/api/messages", headers: auth_headers(@user)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 10, payload["items"].length
    assert_equal 1, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 11, payload["meta"]["total_count"]
    assert_equal 2, payload["meta"]["total_pages"]

    first_page_ids = payload["items"].map { |message| message["id"] }
    get "/api/messages", params: { page: 2, per_page: 100 }, headers: auth_headers(@user)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 1, payload["items"].length
    assert_equal 2, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_empty first_page_ids & payload["items"].map { |message| message["id"] }
  end

  test "messages index rounds invalid page down to one" do
    get "/api/messages", params: { page: "invalid" }, headers: auth_headers(@user)

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["meta"]["page"]

    get "/api/messages", params: { page: 0 }, headers: auth_headers(@user)

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["meta"]["page"]
  end

  test "member sees edit permission only for own messages and no delete permission" do
    own_message = @user.messages.create!(body: "Own")
    other_message = @other_user.messages.create!(body: "Other")

    get "/api/messages", headers: auth_headers(@user)

    assert_response :success
    items = JSON.parse(response.body)["items"]
    own_payload = items.find { |message| message["id"] == own_message.id }
    other_payload = items.find { |message| message["id"] == other_message.id }
    assert_equal true, own_payload["can_edit"]
    assert_equal false, own_payload["can_delete"]
    assert_equal false, other_payload["can_edit"]
    assert_equal false, other_payload["can_delete"]
  end

  test "admin can edit and delete all messages from regular index" do
    @user.messages.create!(body: "Member message")
    @other_user.messages.create!(body: "Other message")

    get "/api/messages", headers: auth_headers(@admin)

    assert_response :success
    JSON.parse(response.body)["items"].each do |message|
      assert_equal true, message["can_edit"]
      assert_equal true, message["can_delete"]
    end
  end

  test "member can update own message" do
    message = @user.messages.create!(body: "Before")
    message.update_columns(created_at: 1.minute.ago, updated_at: 1.minute.ago)

    patch "/api/messages/#{message.id}",
      params: { body: "After" },
      headers: auth_headers(@user)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal "After", payload["body"]
    assert_equal true, payload["edited"]
  end

  test "member cannot update other user's message" do
    message = @other_user.messages.create!(body: "Other")

    patch "/api/messages/#{message.id}",
      params: { body: "Forbidden" },
      headers: auth_headers(@user)

    assert_response :forbidden
    assert_equal "Other", message.reload.body
  end

  test "member cannot delete any message" do
    own_message = @user.messages.create!(body: "Own")
    other_message = @other_user.messages.create!(body: "Other")

    delete "/api/messages/#{own_message.id}", headers: auth_headers(@user)
    assert_response :forbidden
    assert Message.exists?(own_message.id)

    delete "/api/messages/#{other_message.id}", headers: auth_headers(@user)
    assert_response :forbidden
    assert Message.exists?(other_message.id)
  end

  test "admin can update any message" do
    message = @user.messages.create!(body: "Before")

    patch "/api/messages/#{message.id}",
      params: { body: "Admin updated" },
      headers: auth_headers(@admin)

    assert_response :success
    assert_equal "Admin updated", JSON.parse(response.body)["body"]
  end

  test "admin can delete any message" do
    message = @user.messages.create!(body: "Delete target")

    delete "/api/messages/#{message.id}", headers: auth_headers(@admin)

    assert_response :no_content
    assert_nil Message.find_by(id: message.id)
  end

  test "update validation errors do not change message" do
    message = @user.messages.create!(body: "Before")

    patch "/api/messages/#{message.id}",
      params: { body: "" },
      headers: auth_headers(@user)

    assert_response :unprocessable_content
    assert_equal "Before", message.reload.body

    patch "/api/messages/#{message.id}",
      params: { body: "a" * 501 },
      headers: auth_headers(@user)

    assert_response :unprocessable_content
    assert_equal "Before", message.reload.body
  end

  private

  def auth_headers(user)
    token = Rails.application.message_verifier(:auth_token).generate({ user_id: user.id }, expires_in: 24.hours)
    { "Authorization" => "Bearer #{token}" }
  end
end
