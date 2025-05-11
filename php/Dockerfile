FROM php:8.2.11-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    pkg-config \
    gnupg \
    unzip \
    libcurl4-openssl-dev \
    zlib1g-dev \
    libzip-dev \
    libicu-dev \
    libxml2-dev \
    libpq-dev \
    git \
    curl \
    nano \
    wget \
    vim \
    && docker-php-ext-install pdo pdo_mysql zip intl

# Install PostgreSQL extensions
RUN docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql \
    && docker-php-ext-install pdo_pgsql pgsql

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install MongoDB PHP extension with SSL support
RUN pecl install mongodb \
    && docker-php-ext-enable mongodb

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www

EXPOSE 9000

CMD ["php-fpm"]