class ApplicationController < ActionController::API
  include Authentication

  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "not_found" }, status: :not_found
  end

  private

  def render_validation_errors(record)
    render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
  end

  def pagination_page
    page = Integer(params[:page], exception: false)
    page.present? && page >= 1 ? page : 1
  end

  def default_per_page
    10
  end

  def paginated_scope(scope, page:, per_page:)
    scope.limit(per_page).offset((page - 1) * per_page)
  end

  def pagination_meta(scope, page:, per_page:)
    total_count = scope.count

    {
      page: page,
      per_page: per_page,
      total_count: total_count,
      total_pages: (total_count / per_page.to_f).ceil
    }
  end
end
