import appTemplate from '../templates/app.njk';
import encryptTextTemplate from '../templates/encryptText.njk';

import zxcvbn from 'zxcvbn';
import pbkdf2 from 'pbkdf2';
import jssalsa20 from 'js-salsa20';
import base64 from 'base64-js';

class App
{
    constructor(rootId) {
        this.$root = $(rootId);
        this.$root.html(appTemplate.render());

        this.cacheDom();
        this.bindEvents();

        this.startEncryptText();
    }

    cacheDom() {
        this.$moduleRoot = $('#module-root');
    }

    bindEvents() {
        this.$root.on('keyup change focus blur paste cut', 'input[type="password"].js-zxcvbn', this.displayZxcvbnRating);
        this.$root.on('keyup change focus blur paste cut', '.js-encrypt-text-form input, .js-encrypt-text-form textarea', this.encryptText.bind(this))
    }

    startEncryptText() {
        this.$moduleRoot.html(encryptTextTemplate.render());
        this.$password = $('#password');
        this.$passwordConfirm = $('#password-confirm');
        this.$plainText = $('#plaintext');
        this.$cipherText = $('#ciphertext');
        this.$error = $('#error').hide();
    }

    encryptText() {
        if (!this.$password.val().trim()) {
            this.$cipherText.val('');
            return this.error('Empty password is not allowed');
        }

        if (this.$password.val() != this.$passwordConfirm.val()) {
            this.$cipherText.val('');
            return this.error('Passwords do not match');
        }

        if (!this.$plainText.val().trim()) {
            this.$cipherText.val('');
            return this.error('Plaintext is empty');
        }

        const cipherText = this.encryptStringToBase64(
            this.$plainText.val().trim(),
            this.$password.val().trim()
        );

        this.$cipherText.val(cipherText);

        this.$error.hide();
    }

    error(message) {
        this.$error.html(message).show();
    }

    encryptStringToBase64(text, password) {
        const pkey = pbkdf2.pbkdf2Sync(password, 'salt', 10, 40, 'sha512');

        const key = pkey.slice(0, 32);
        const nonce = pkey.slice(32);

        const salsa = new jssalsa20(key, nonce);

        return base64.fromByteArray(salsa.encrypt((new TextEncoder()).encode(text)));
    }

    displayZxcvbnRating(event) {
        const $target = $(event.currentTarget);
        const $small = $target.next('small');

        if ($target.val().trim() === '') {
            $small.html('');
        } else {
            const rating = zxcvbn($target.val());

            $small.html(`<a href="https://github.com/dropbox/zxcvbn" target="_blank">Zxcvbn</a> fast crack time: ${rating.crack_times_display.offline_fast_hashing_1e10_per_second} `);
        }
    }
}

const qrcrypt = new App('#app');

