FROM php:7.3-apache

# 一层搞定：装扩展 + 启用模块 + 清理
RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite \
    && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /var/www/html

# 先拷配置文件（不易变），再拷业务代码
COPY config/      config/
COPY includes/    includes/
COPY api/         api/
COPY assets/      assets/
COPY *.php        ./
COPY .htaccess    ./

RUN chown -R www-data:www-data /var/www/html \
    && chmod 664 /var/www/html/config/connections.json 2>/dev/null || true \
    && rm -f server.js

EXPOSE 80
