# frozen_string_literal: true

require 'test_helper'

# Verifies CORS preflight behavior for authentication routes.
class CorsPreflightTest < ActionDispatch::IntegrationTest
  test 'login preflight allows configured schemeful frontend origin' do
    origin = ENV.fetch('FRONTEND_ORIGIN', 'http://localhost:5173')

    options '/api/auth/login', headers: {
      'Origin' => origin,
      'Access-Control-Request-Method' => 'POST',
      'Access-Control-Request-Headers' => 'Content-Type'
    }

    assert_response :success
    assert_equal [true, origin, true], [
      origin.match?(%r{\Ahttps?://}),
      response.headers['Access-Control-Allow-Origin'],
      response.headers['Access-Control-Allow-Methods'].include?('POST')
    ]
  end
end
