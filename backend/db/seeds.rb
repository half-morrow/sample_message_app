admin_email = ENV["ADMIN_EMAIL"]
admin_password = ENV["ADMIN_PASSWORD"]

if admin_email.present? && admin_password.present?
  User.find_or_initialize_by(email: admin_email).tap do |user|
    user.name = ENV.fetch("ADMIN_NAME", "Admin")
    user.password = admin_password
    user.password_confirmation = admin_password
    user.role = "admin"
    user.save!
  end
else
  Rails.logger.info("ADMIN_EMAIL and ADMIN_PASSWORD are not set. Skipping admin seed.")
end
