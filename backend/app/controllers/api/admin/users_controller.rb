# frozen_string_literal: true

module Api
  module Admin
    # Handles admin user management endpoints.
    class UsersController < ApplicationController
      before_action :authenticate_admin!
      before_action :set_user, only: %i[show update destroy]

      def index
        users = User.search(params[:q]).order(created_at: :desc)
        page = pagination_page
        per_page = default_per_page

        render json: {
          items: paginated_scope(users, page: page,
                                        per_page: per_page).as_json(only: %i[id name email role created_at]),
          meta: pagination_meta(users, page: page, per_page: per_page)
        }
      end

      def show
        render json: @user.as_json(only: %i[id name email role created_at updated_at])
      end

      def create
        user = User.new(user_params)

        if user.save
          render json: user.as_json(only: %i[id name email role created_at]), status: :created
        else
          render_validation_errors(user)
        end
      end

      def update
        if @user.update(user_params)
          render json: @user.as_json(only: %i[id name email role updated_at])
        else
          render_validation_errors(@user)
        end
      end

      def destroy
        if current_user.id == @user.id
          render json: { error: 'forbidden' }, status: :forbidden
          return
        end

        @user.destroy!
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def user_params
        params.permit(:name, :email, :role, :password, :password_confirmation)
      end
    end
  end
end
