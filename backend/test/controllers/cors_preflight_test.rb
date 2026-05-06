require "test_helper"

class CorsPreflightTest < ActionDispatch::IntegrationTest
  test "login preflight allows configured schemeful frontend origin" do
    origin = ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")

    assert_match %r{\Ahttps?://}, origin

    options "/api/auth/login", headers: {
      "Origin" => origin,
      "Access-Control-Request-Method" => "POST",
      "Access-Control-Request-Headers" => "Content-Type"
    }

    assert_response :success
    assert_equal origin, response.headers["Access-Control-Allow-Origin"]
    assert_includes response.headers["Access-Control-Allow-Methods"], "POST"
  end
end
