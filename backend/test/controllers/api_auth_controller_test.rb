require "test_helper"

class ApiAuthControllerTest < ActionDispatch::IntegrationTest
  test "register creates user and returns token" do
    post "/api/auth/register", params: {
      name: "New User",
      email: "new@example.com",
      password: "password123",
      password_confirmation: "password123"
    }

    assert_response :created
    body = JSON.parse(response.body)
    assert body["token"].present?
    assert_equal "new@example.com", body.dig("user", "email")
  end

  test "login rejects invalid password" do
    build_user(email: "login@example.com").save!

    post "/api/auth/login", params: { email: "login@example.com", password: "wrong" }

    assert_response :unauthorized
  end
end
