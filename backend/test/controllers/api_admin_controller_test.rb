# frozen_string_literal: true

require 'test_helper'
require 'securerandom'

# Shared setup and assertions for admin API controller tests.
module ApiAdminControllerTestSupport
  def setup_admin_records
    Message.delete_all
    User.delete_all

    suffix = SecureRandom.hex(4)
    @admin = build_user(email: "admin-#{suffix}@example.com", role: 'admin')
    @admin.save!
    @member = build_user(email: "member-#{suffix}@example.com")
    @member.save!
    @message = @member.messages.create!(body: 'Admin target')
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

# Verifies admin API authentication and authorization boundaries.
class ApiAdminAccessControllerTest < ActionDispatch::IntegrationTest
  include ApiAdminControllerTestSupport

  setup :setup_admin_records

  test 'member cannot access admin users' do
    get '/api/admin/users', headers: auth_headers(@member)

    assert_response :forbidden
  end

  test 'member cannot access admin messages' do
    get '/api/admin/messages', headers: auth_headers(@member)

    assert_response :forbidden
  end

  test 'requires authentication for admin api' do
    get '/api/admin/messages'

    assert_response :unauthorized
  end
end

# Verifies admin user management endpoints.
class ApiAdminUsersControllerTest < ActionDispatch::IntegrationTest
  include ApiAdminControllerTestSupport

  setup :setup_admin_records

  test 'admin can search users' do
    get '/api/admin/users', params: { q: 'member' }, headers: auth_headers(@admin)

    assert_response :success
    payload = response.parsed_body

    assert_equal @member.email, payload['items'].first['email']
    expect_pagination(payload, page: 1, per_page: 10, total_count: 1, total_pages: 1)
  end

  test 'admin users index is paginated with fixed metadata' do
    11.times do |index|
      build_user(email: "page-user-#{index}@example.com").tap(&:save!)
    end

    get '/api/admin/users', headers: auth_headers(@admin)

    first_status = response.status
    first_page = response.parsed_body

    assert_equal [200, 10], [first_status, first_page['items'].length]
    expect_pagination(first_page, page: 1, per_page: 10, total_count: 13, total_pages: 2)

    get '/api/admin/users', params: { page: 2, per_page: 100 }, headers: auth_headers(@admin)

    second_status = response.status
    second_page = response.parsed_body

    assert_equal [200, 3, 2, 10], [
      second_status, second_page['items'].length, second_page['meta']['page'], second_page['meta']['per_page']
    ]
    expect_no_page_overlap(first_page, second_page)
  end

  test 'admin users index paginates searched results' do
    11.times do |index|
      build_user(name: "Paged User #{index}", email: "paged-user-#{index}@example.com").tap(&:save!)
    end

    get '/api/admin/users', params: { q: 'Paged', page: 2 }, headers: auth_headers(@admin)

    assert_response :success
    payload = response.parsed_body

    assert_equal 1, payload['items'].length
    expect_pagination(payload, page: 2, per_page: 10, total_count: 11, total_pages: 2)
  end

  test 'admin users index rounds invalid page down to one' do
    get '/api/admin/users', params: { page: 'invalid' }, headers: auth_headers(@admin)
    invalid_page_status = response.status
    first_payload = response.parsed_body

    get '/api/admin/users', params: { page: 0 }, headers: auth_headers(@admin)
    zero_page_status = response.status
    second_payload = response.parsed_body

    assert_equal [200, 1, 200, 1], [invalid_page_status, first_payload['meta']['page'],
                                    zero_page_status, second_payload['meta']['page']]
  end

  test 'admin can create user' do
    post '/api/admin/users',
         params: {
           name: 'Created User',
           email: 'created@example.com',
           role: 'member',
           password: 'password123',
           password_confirmation: 'password123'
         },
         headers: auth_headers(@admin)

    assert_response :created
    assert_equal 'created@example.com', response.parsed_body['email']
  end

  test 'admin can show user' do
    get "/api/admin/users/#{@member.id}", headers: auth_headers(@admin)

    assert_response :success
    assert_equal @member.id, response.parsed_body['id']
  end

  test 'admin can update user' do
    patch "/api/admin/users/#{@member.id}",
          params: { name: 'Updated Member', email: 'updated-member@example.com', role: 'admin' },
          headers: auth_headers(@admin)

    assert_response :success
    assert_equal(
      ['Updated Member', 'updated-member@example.com', 'admin'],
      response.parsed_body.values_at('name', 'email', 'role')
    )
  end

  test 'admin can destroy user' do
    target = build_user(email: 'delete-user@example.com')
    target.save!

    delete "/api/admin/users/#{target.id}", headers: auth_headers(@admin)

    assert_response :no_content
    assert_nil User.find_by(id: target.id)
  end

  test 'admin cannot destroy self' do
    delete "/api/admin/users/#{@admin.id}", headers: auth_headers(@admin)

    assert_response :forbidden
    assert_equal ['forbidden', true], [response.parsed_body['error'], User.exists?(@admin.id)]
  end
end

# Verifies admin message management endpoints.
class ApiAdminMessagesControllerTest < ActionDispatch::IntegrationTest
  include ApiAdminControllerTestSupport

  setup :setup_admin_records

  test 'admin can search messages' do
    get '/api/admin/messages', params: { q: 'target' }, headers: auth_headers(@admin)

    assert_response :success
    payload = response.parsed_body

    assert_equal @message.id, payload['items'].first['id']
    expect_pagination(payload, page: 1, per_page: 10, total_count: 1, total_pages: 1)
  end

  test 'admin messages index is paginated with fixed metadata' do
    11.times do |index|
      @member.messages.create!(body: "Paged message #{index}")
    end

    get '/api/admin/messages', headers: auth_headers(@admin)

    first_status = response.status
    first_page = response.parsed_body

    assert_equal [200, 10], [first_status, first_page['items'].length]
    expect_pagination(first_page, page: 1, per_page: 10, total_count: 12, total_pages: 2)

    get '/api/admin/messages', params: { page: 2, per_page: 100 }, headers: auth_headers(@admin)

    second_status = response.status
    second_page = response.parsed_body

    assert_equal [200, 2, 2, 10], [
      second_status, second_page['items'].length, second_page['meta']['page'], second_page['meta']['per_page']
    ]
    expect_no_page_overlap(first_page, second_page)
  end

  test 'admin messages index paginates searched results' do
    11.times do |index|
      @member.messages.create!(body: "Searchable message #{index}")
    end

    get '/api/admin/messages', params: { q: 'Searchable', page: 2 }, headers: auth_headers(@admin)

    assert_response :success
    payload = response.parsed_body

    assert_equal 1, payload['items'].length
    expect_pagination(payload, page: 2, per_page: 10, total_count: 11, total_pages: 2)
  end

  test 'admin messages index rounds invalid page down to one' do
    get '/api/admin/messages', params: { page: 'invalid' }, headers: auth_headers(@admin)
    invalid_page_status = response.status
    first_payload = response.parsed_body

    get '/api/admin/messages', params: { page: 0 }, headers: auth_headers(@admin)
    zero_page_status = response.status
    second_payload = response.parsed_body

    assert_equal [200, 1, 200, 1], [invalid_page_status, first_payload['meta']['page'],
                                    zero_page_status, second_payload['meta']['page']]
  end

  test 'admin can create message as current admin' do
    post '/api/admin/messages',
         params: { body: 'Admin created' },
         headers: auth_headers(@admin)

    assert_response :created
    assert_equal(
      ['Admin created', @admin.id],
      response.parsed_body.values_at('body', 'user').then { |body, user| [body, user['id']] }
    )
  end

  test 'admin can show message' do
    get "/api/admin/messages/#{@message.id}", headers: auth_headers(@admin)

    assert_response :success
    assert_equal @message.id, response.parsed_body['id']
  end

  test 'admin can update message' do
    patch "/api/admin/messages/#{@message.id}",
          params: { body: 'Updated' },
          headers: auth_headers(@admin)

    assert_response :success
    assert_equal 'Updated', response.parsed_body['body']
  end

  test 'admin can destroy message' do
    delete "/api/admin/messages/#{@message.id}", headers: auth_headers(@admin)

    assert_response :no_content
    assert_nil Message.find_by(id: @message.id)
  end
end
