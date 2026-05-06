require "test_helper"
require "securerandom"

class ApiAdminControllerTest < ActionDispatch::IntegrationTest
  setup do
    Message.delete_all
    User.delete_all

    suffix = SecureRandom.hex(4)
    @admin = build_user(email: "admin-#{suffix}@example.com", role: "admin")
    @admin.save!
    @member = build_user(email: "member-#{suffix}@example.com")
    @member.save!
    @message = @member.messages.create!(body: "Admin target")
  end

  test "member cannot access admin users" do
    get "/api/admin/users", headers: auth_headers(@member)

    assert_response :forbidden
  end

  test "member cannot access admin messages" do
    get "/api/admin/messages", headers: auth_headers(@member)

    assert_response :forbidden
  end

  test "requires authentication for admin api" do
    get "/api/admin/messages"

    assert_response :unauthorized
  end

  test "admin can search users" do
    get "/api/admin/users", params: { q: "member" }, headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal @member.email, payload["items"].first["email"]
    assert_equal 1, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 1, payload["meta"]["total_count"]
    assert_equal 1, payload["meta"]["total_pages"]
  end

  test "admin users index is paginated with fixed metadata" do
    11.times do |index|
      build_user(email: "page-user-#{index}@example.com").tap(&:save!)
    end

    get "/api/admin/users", headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 10, payload["items"].length
    assert_equal 1, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 13, payload["meta"]["total_count"]
    assert_equal 2, payload["meta"]["total_pages"]

    first_page_ids = payload["items"].map { |user| user["id"] }
    get "/api/admin/users", params: { page: 2, per_page: 100 }, headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 3, payload["items"].length
    assert_equal 2, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_empty first_page_ids & payload["items"].map { |user| user["id"] }
  end

  test "admin users index paginates searched results" do
    11.times do |index|
      build_user(name: "Paged User #{index}", email: "paged-user-#{index}@example.com").tap(&:save!)
    end

    get "/api/admin/users", params: { q: "Paged", page: 2 }, headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 1, payload["items"].length
    assert_equal 2, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 11, payload["meta"]["total_count"]
    assert_equal 2, payload["meta"]["total_pages"]
  end

  test "admin users index rounds invalid page down to one" do
    get "/api/admin/users", params: { page: "invalid" }, headers: auth_headers(@admin)

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["meta"]["page"]

    get "/api/admin/users", params: { page: 0 }, headers: auth_headers(@admin)

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["meta"]["page"]
  end

  test "admin can create user" do
    post "/api/admin/users",
      params: {
        name: "Created User",
        email: "created@example.com",
        role: "member",
        password: "password123",
        password_confirmation: "password123"
      },
      headers: auth_headers(@admin)

    assert_response :created
    assert_equal "created@example.com", JSON.parse(response.body)["email"]
  end

  test "admin can show user" do
    get "/api/admin/users/#{@member.id}", headers: auth_headers(@admin)

    assert_response :success
    assert_equal @member.id, JSON.parse(response.body)["id"]
  end

  test "admin can update user" do
    patch "/api/admin/users/#{@member.id}",
      params: { name: "Updated Member", email: "updated-member@example.com", role: "admin" },
      headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal "Updated Member", payload["name"]
    assert_equal "updated-member@example.com", payload["email"]
    assert_equal "admin", payload["role"]
  end

  test "admin can destroy user" do
    target = build_user(email: "delete-user@example.com")
    target.save!

    delete "/api/admin/users/#{target.id}", headers: auth_headers(@admin)

    assert_response :no_content
    assert_nil User.find_by(id: target.id)
  end

  test "admin cannot destroy self" do
    delete "/api/admin/users/#{@admin.id}", headers: auth_headers(@admin)

    assert_response :forbidden
    assert_equal "forbidden", JSON.parse(response.body)["error"]
    assert_not_nil User.find_by(id: @admin.id)
  end

  test "admin can search messages" do
    get "/api/admin/messages", params: { q: "target" }, headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal @message.id, payload["items"].first["id"]
    assert_equal 1, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 1, payload["meta"]["total_count"]
    assert_equal 1, payload["meta"]["total_pages"]
  end

  test "admin messages index is paginated with fixed metadata" do
    11.times do |index|
      @member.messages.create!(body: "Paged message #{index}")
    end

    get "/api/admin/messages", headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 10, payload["items"].length
    assert_equal 1, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 12, payload["meta"]["total_count"]
    assert_equal 2, payload["meta"]["total_pages"]

    first_page_ids = payload["items"].map { |message| message["id"] }
    get "/api/admin/messages", params: { page: 2, per_page: 100 }, headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 2, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 2, payload["items"].length
    assert_empty first_page_ids & payload["items"].map { |message| message["id"] }
  end

  test "admin messages index paginates searched results" do
    11.times do |index|
      @member.messages.create!(body: "Searchable message #{index}")
    end

    get "/api/admin/messages", params: { q: "Searchable", page: 2 }, headers: auth_headers(@admin)

    assert_response :success
    payload = JSON.parse(response.body)
    assert_equal 1, payload["items"].length
    assert_equal 2, payload["meta"]["page"]
    assert_equal 10, payload["meta"]["per_page"]
    assert_equal 11, payload["meta"]["total_count"]
    assert_equal 2, payload["meta"]["total_pages"]
  end

  test "admin messages index rounds invalid page down to one" do
    get "/api/admin/messages", params: { page: "invalid" }, headers: auth_headers(@admin)

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["meta"]["page"]

    get "/api/admin/messages", params: { page: 0 }, headers: auth_headers(@admin)

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["meta"]["page"]
  end

  test "admin can create message as current admin" do
    post "/api/admin/messages",
      params: { body: "Admin created" },
      headers: auth_headers(@admin)

    assert_response :created
    payload = JSON.parse(response.body)
    assert_equal "Admin created", payload["body"]
    assert_equal @admin.id, payload["user"]["id"]
  end

  test "admin can show message" do
    get "/api/admin/messages/#{@message.id}", headers: auth_headers(@admin)

    assert_response :success
    assert_equal @message.id, JSON.parse(response.body)["id"]
  end

  test "admin can update message" do
    patch "/api/admin/messages/#{@message.id}",
      params: { body: "Updated" },
      headers: auth_headers(@admin)

    assert_response :success
    assert_equal "Updated", JSON.parse(response.body)["body"]
  end

  test "admin can destroy message" do
    delete "/api/admin/messages/#{@message.id}", headers: auth_headers(@admin)

    assert_response :no_content
    assert_nil Message.find_by(id: @message.id)
  end

  private

  def auth_headers(user)
    token = Rails.application.message_verifier(:auth_token).generate({ user_id: user.id }, expires_in: 24.hours)
    { "Authorization" => "Bearer #{token}" }
  end
end
