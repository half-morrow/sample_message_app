# frozen_string_literal: true

require 'test_helper'

class MessageTest < ActiveSupport::TestCase
  setup do
    @user = build_user(email: 'message@example.com')
    @user.save!
  end

  test 'valid with body and user' do
    assert_predicate @user.messages.new(body: 'Hello'), :valid?
  end

  test 'requires body' do
    message = @user.messages.new(body: '')

    assert_not message.valid?
  end

  test 'limits body length' do
    message = @user.messages.new(body: 'a' * 501)

    assert_not message.valid?
  end

  test 'search matches body' do
    message = @user.messages.create!(body: 'Searchable text')

    assert_includes Message.search('searchable'), message
  end
end
