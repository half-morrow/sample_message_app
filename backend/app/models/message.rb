class Message < ApplicationRecord
  belongs_to :user

  validates :body, presence: true, length: { maximum: 500 }

  scope :recent, -> { order(created_at: :desc) }
  scope :search, ->(query) {
    normalized = query.to_s.strip.downcase
    next all if normalized.blank?

    where("LOWER(body) LIKE ?", "%#{sanitize_sql_like(normalized)}%")
  }
end
