# frozen_string_literal: true

require 'test_helper'

class UserTest < ActiveSupport::TestCase
  test 'valid with required attributes' do
    assert_predicate build_user, :valid?
  end

  test 'normalizes email' do
    user = build_user(email: ' USER@Example.COM ')

    assert_predicate user, :valid?
    assert_equal 'user@example.com', user.email
  end

  test 'requires valid email' do
    user = build_user(email: 'invalid')

    assert_not user.valid?
    assert_includes user.errors[:email], 'is invalid'
  end

  test 'requires password length' do
    user = build_user(password: 'short', password_confirmation: 'short')

    assert_not user.valid?
  end

  test 'admin role predicate' do
    assert_predicate build_user(role: 'admin'), :admin?
    assert_not build_user(role: 'member').admin?
  end

  test 'search matches name or email' do
    user = build_user(name: 'Alice', email: 'alice@example.com')
    user.save!

    assert_includes User.search('ali'), user
    assert_includes User.search('example'), user
  end
end
