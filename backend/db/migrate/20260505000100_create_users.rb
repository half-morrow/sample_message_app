# frozen_string_literal: true

# Creates users for authentication and authorization.
class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :role, null: false, default: 'member'

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :role
  end
end
