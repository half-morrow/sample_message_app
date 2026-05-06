module Authentication
  extend ActiveSupport::Concern

  included do
    attr_reader :current_user
  end

  private

  def authenticate_user!
    @current_user = user_from_token
    return if @current_user

    render json: { error: "unauthorized" }, status: :unauthorized
  end

  def authenticate_admin!
    authenticate_user!
    return if performed?
    return if current_user.admin?

    render json: { error: "forbidden" }, status: :forbidden
  end

  def issue_token(user)
    verifier.generate({ user_id: user.id }, expires_in: 24.hours)
  end

  def user_from_token
    token = request.authorization.to_s.delete_prefix("Bearer ").presence
    payload = verifier.verified(token)
    User.find_by(id: payload[:user_id] || payload["user_id"]) if payload
  end

  def verifier
    Rails.application.message_verifier(:auth_token)
  end
end
