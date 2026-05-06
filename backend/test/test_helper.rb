ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: :number_of_processors)

  def build_user(attributes = {})
    User.new({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      password_confirmation: "password123"
    }.merge(attributes))
  end
end
