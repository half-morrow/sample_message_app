Rails.application.routes.draw do
  namespace :api do
    post "auth/register", to: "auth#register"
    post "auth/login", to: "auth#login"
    delete "auth/logout", to: "auth#logout"

    resources :messages, only: %i[index create update destroy]

    namespace :admin do
      resources :users, only: %i[index show create update destroy]
      resources :messages, only: %i[index show create update destroy]
    end
  end
end
