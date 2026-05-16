class Api::MessagesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_message, only: %i[update destroy]

  def index
    messages = Message.includes(:user).recent
    page = pagination_page
    per_page = default_per_page

    render json: {
      items: paginated_scope(messages, page: page, per_page: per_page).map { |message| serialize_message(message) },
      meta: pagination_meta(messages, page: page, per_page: per_page)
    }
  end

  def create
    message = current_user.messages.new(message_params)

    if message.save
      render json: serialize_message(message), status: :created
    else
      render_validation_errors(message)
    end
  end

  def update
    return render_forbidden unless can_edit?(@message)

    if @message.update(message_params)
      render json: serialize_message(@message)
    else
      render_validation_errors(@message)
    end
  end

  def destroy
    return render_forbidden unless current_user.admin?

    @message.destroy!
    head :no_content
  end

  private

  def set_message
    @message = Message.find(params[:id])
  end

  def message_params
    params.permit(:body)
  end

  def serialize_message(message)
    {
      id: message.id,
      body: message.body,
      created_at: message.created_at,
      updated_at: message.updated_at,
      edited: message.updated_at > message.created_at,
      can_edit: can_edit?(message),
      can_delete: current_user.admin?,
      user: message.user.as_json(only: %i[id name])
    }
  end

  def can_edit?(message)
    current_user.admin? || message.user_id == current_user.id
  end

  def render_forbidden
    render json: { error: "forbidden" }, status: :forbidden
  end

end
