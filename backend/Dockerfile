FROM ruby:3.3.0-slim

WORKDIR /app

ENV BUNDLE_PATH=/bundle \
    BUNDLE_BIN=/bundle/bin \
    GEM_HOME=/bundle \
    PATH="/bundle/bin:${PATH}"

RUN apt-get update -qq \
  && apt-get install --no-install-recommends -y build-essential libpq-dev pkg-config \
  && rm -rf /var/lib/apt/lists/*

COPY Gemfile ./

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
