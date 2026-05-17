# frozen_string_literal: true

module Api
  module Admin
    # Handles admin message management endpoints.
    class MessagesController < ApplicationController
      before_action :authenticate_admin!
      before_action :set_message, only: %i[show update destroy]

      def index
        messages = Message.includes(:user).search(params[:q]).recent
        page = pagination_page
        per_page = default_per_page

        render json: {
          items: paginated_scope(messages, page: page, per_page: per_page).map { |message| serialize_message(message) },
          meta: pagination_meta(messages, page: page, per_page: per_page)
        }
      end

      def show
        render json: serialize_message(@message)
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
        if @message.update(message_params)
          render json: serialize_message(@message)
        else
          render_validation_errors(@message)
        end
      end

      def destroy
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
          user: message.user.as_json(only: %i[id name email])
        }
      end
    end
  end
end
