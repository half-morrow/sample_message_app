# frozen_string_literal: true

# Application user with authentication and role information.
class User < ApplicationRecord
  has_secure_password

  has_many :messages, dependent: :destroy

  enum :role, { member: 'member', admin: 'admin' }, default: 'member'

  before_validation :normalize_email

  validates :name, presence: true, length: { maximum: 80 }
  validates :email,
            presence: true,
            uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP },
            length: { maximum: 255 }
  validates :role, presence: true, inclusion: { in: roles.keys }
  validates :password, length: { minimum: 8 }, allow_nil: true

  scope :search, lambda { |query|
    normalized = query.to_s.strip.downcase
    next all if normalized.blank?

    where('LOWER(name) LIKE :q OR LOWER(email) LIKE :q', q: "%#{sanitize_sql_like(normalized)}%")
  }

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
