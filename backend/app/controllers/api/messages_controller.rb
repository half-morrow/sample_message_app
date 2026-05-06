class Api::MessagesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_message, only: %i[update destroy]

  def index
    messages = Message.includes(:user).recent
    page = page_param
    per_page = 10
    total_count = messages.count

    render json: {
      items: messages.limit(per_page).offset((page - 1) * per_page).map { |message| serialize_message(message) },
      meta: {
        page: page,
        per_page: per_page,
        total_count: total_count,
        total_pages: (total_count / per_page.to_f).ceil
      }
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

  def page_param
    page = Integer(params[:page], exception: false)
    page.present? && page >= 1 ? page : 1
  end
end
