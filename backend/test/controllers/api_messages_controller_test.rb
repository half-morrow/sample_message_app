# frozen_string_literal: true

require 'test_helper'
require 'securerandom'

# Shared setup and assertions for message API controller tests.
module ApiMessagesControllerTestSupport
  def setup_message_users
    Message.delete_all
    User.delete_all

    suffix = SecureRandom.hex(4)
    @user = build_user(email: "chat-#{suffix}@example.com")
    @user.save!
    @other_user = build_user(email: "other-chat-#{suffix}@example.com")
    @other_user.save!
    @admin = build_user(email: "chat-admin-#{suffix}@example.com", role: 'admin')
    @admin.save!
  end

  def auth_headers(user)
    token = Rails.application.message_verifier(:auth_token).generate({ user_id: user.id }, expires_in: 24.hours)
    { 'Authorization' => "Bearer #{token}" }
  end

  def expect_pagination(payload, page:, per_page:, total_count:, total_pages:)
    assert_equal(
      { 'page' => page, 'per_page' => per_page, 'total_count' => total_count, 'total_pages' => total_pages },
      payload['meta']
    )
  end

  def expect_no_page_overlap(first_page, second_page)
    assert_empty first_page['items'].pluck('id') & second_page['items'].pluck('id')
  end
end

# Verifies authentication and index behavior for the regular message API.
class ApiMessagesIndexControllerTest < ActionDispatch::IntegrationTest
  include ApiMessagesControllerTestSupport

  setup :setup_message_users

  test 'requires authentication' do
    get '/api/messages'

    assert_response :unauthorized
  end

  test 'authenticated user creates message' do
    post '/api/messages',
         params: { body: 'Hello' },
         headers: auth_headers(@user)

    assert_response :created
    assert_equal 'Hello', response.parsed_body['body']
  end

  test 'authenticated user lists messages' do
    @user.messages.create!(body: 'Listed message')

    get '/api/messages', headers: auth_headers(@user)

    assert_response :success
    payload = response.parsed_body

    assert_equal 'Listed message', payload['items'].first['body']
    assert_equal(
      %w[updated_at edited can_edit can_delete],
      payload['items'].first.keys & %w[updated_at edited can_edit can_delete]
    )
    expect_pagination(payload, page: 1, per_page: 10, total_count: 1, total_pages: 1)
  end

  test 'messages index is paginated with fixed metadata' do
    11.times do |index|
      @user.messages.create!(body: "Paged message #{index}")
    end

    get '/api/messages', headers: auth_headers(@user)

    first_status = response.status
    first_page = response.parsed_body

    assert_equal [200, 10], [first_status, first_page['items'].length]
    expect_pagination(first_page, page: 1, per_page: 10, total_count: 11, total_pages: 2)

    get '/api/messages', params: { page: 2, per_page: 100 }, headers: auth_headers(@user)

    second_status = response.status
    second_page = response.parsed_body

    assert_equal [200, 1, 2, 10], [
      second_status, second_page['items'].length, second_page['meta']['page'], second_page['meta']['per_page']
    ]
    expect_no_page_overlap(first_page, second_page)
  end

  test 'messages index rounds invalid page down to one' do
    get '/api/messages', params: { page: 'invalid' }, headers: auth_headers(@user)
    invalid_page_status = response.status
    invalid_page_payload = response.parsed_body

    get '/api/messages', params: { page: 0 }, headers: auth_headers(@user)
    zero_page_status = response.status
    zero_page_payload = response.parsed_body

    assert_equal [200, 1, 200, 1], [invalid_page_status, invalid_page_payload['meta']['page'],
                                    zero_page_status, zero_page_payload['meta']['page']]
  end

  test 'member sees edit permission only for own messages and no delete permission' do
    own_message = @user.messages.create!(body: 'Own')
    other_message = @other_user.messages.create!(body: 'Other')

    get '/api/messages', headers: auth_headers(@user)

    assert_response :success
    items = response.parsed_body['items']
    own_payload = items.find { |message| message['id'] == own_message.id }
    other_payload = items.find { |message| message['id'] == other_message.id }

    assert_equal [true, false, false, false], [
      own_payload['can_edit'], own_payload['can_delete'], other_payload['can_edit'], other_payload['can_delete']
    ]
  end

  test 'admin can edit and delete all messages from regular index' do
    @user.messages.create!(body: 'Member message')
    @other_user.messages.create!(body: 'Other message')

    get '/api/messages', headers: auth_headers(@admin)

    assert_response :success
    assert_empty(response.parsed_body['items'].reject { |message| message['can_edit'] && message['can_delete'] })
  end
end

# Verifies update and delete behavior for the regular message API.
class ApiMessagesMutationControllerTest < ActionDispatch::IntegrationTest
  include ApiMessagesControllerTestSupport

  setup :setup_message_users

  test 'requires authentication for update and delete' do
    message = @user.messages.create!(body: 'Protected')

    patch "/api/messages/#{message.id}", params: { body: 'Changed' }
    patch_status = response.status
    unchanged_after_patch = message.reload.body == 'Protected'

    delete "/api/messages/#{message.id}"
    delete_status = response.status

    assert_equal(
      [401, true, 401, true],
      [patch_status, unchanged_after_patch, delete_status, Message.exists?(message.id)]
    )
  end

  test 'member can update own message' do
    message = @user.messages.create!(body: 'Before')
    message.update!(created_at: 1.minute.ago, updated_at: 1.minute.ago)

    patch "/api/messages/#{message.id}",
          params: { body: 'After' },
          headers: auth_headers(@user)

    assert_response :success
    assert_equal ['After', true], response.parsed_body.values_at('body', 'edited')
  end

  test "member cannot update other user's message" do
    message = @other_user.messages.create!(body: 'Other')

    patch "/api/messages/#{message.id}",
          params: { body: 'Forbidden' },
          headers: auth_headers(@user)

    assert_response :forbidden
    assert_equal 'Other', message.reload.body
  end

  test 'member cannot delete any message' do
    own_message = @user.messages.create!(body: 'Own')
    other_message = @other_user.messages.create!(body: 'Other')

    delete "/api/messages/#{own_message.id}", headers: auth_headers(@user)
    own_delete_status = response.status

    delete "/api/messages/#{other_message.id}", headers: auth_headers(@user)
    other_delete_status = response.status

    assert_equal [403, true, 403, true], [
      own_delete_status, Message.exists?(own_message.id), other_delete_status, Message.exists?(other_message.id)
    ]
  end

  test 'admin can update any message' do
    message = @user.messages.create!(body: 'Before')

    patch "/api/messages/#{message.id}",
          params: { body: 'Admin updated' },
          headers: auth_headers(@admin)

    assert_response :success
    assert_equal 'Admin updated', response.parsed_body['body']
  end

  test 'admin can delete any message' do
    message = @user.messages.create!(body: 'Delete target')

    delete "/api/messages/#{message.id}", headers: auth_headers(@admin)

    assert_response :no_content
    assert_nil Message.find_by(id: message.id)
  end

  test 'update validation errors do not change message' do
    message = @user.messages.create!(body: 'Before')

    patch "/api/messages/#{message.id}",
          params: { body: '' },
          headers: auth_headers(@user)
    blank_status = response.status
    unchanged_after_blank = message.reload.body == 'Before'

    patch "/api/messages/#{message.id}",
          params: { body: 'a' * 501 },
          headers: auth_headers(@user)
    long_status = response.status

    assert_equal [422, true, 422, 'Before'], [blank_status, unchanged_after_blank, long_status, message.reload.body]
  end
end
