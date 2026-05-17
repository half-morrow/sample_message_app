# frozen_string_literal: true

admin_email = ENV.fetch('ADMIN_EMAIL', nil)
admin_password = ENV.fetch('ADMIN_PASSWORD', nil)

if admin_email.present? && admin_password.present?
  User.find_or_initialize_by(email: admin_email).tap do |user|
    user.name = ENV.fetch('ADMIN_NAME', 'Admin')
    user.password = admin_password
    user.password_confirmation = admin_password
    user.role = 'admin'
    user.save!
  end
else
  Rails.logger.info('ADMIN_EMAIL and ADMIN_PASSWORD are not set. Skipping admin seed.')
end
