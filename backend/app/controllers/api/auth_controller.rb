# frozen_string_literal: true

module Api
  # Handles user registration, login, and logout.
  class AuthController < ApplicationController
    before_action :authenticate_user!, only: :logout

    def register
      user = User.new(user_params)

      if user.save
        render json: auth_payload(user), status: :created
      else
        render_validation_errors(user)
      end
    end

    def login
      user = User.find_by(email: params[:email].to_s.strip.downcase)

      if user&.authenticate(params[:password])
        render json: auth_payload(user)
      else
        render json: { error: 'invalid_email_or_password' }, status: :unauthorized
      end
    end

    def logout
      head :no_content
    end

    private

    def auth_payload(user)
      { token: issue_token(user), user: user.as_json(only: %i[id name email role]) }
    end

    def user_params
      params.permit(:name, :email, :password, :password_confirmation)
    end
  end
end
