document.addEventListener('DOMContentLoaded', function() {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) {
        return;
    }
    const nomInput = document.getElementById('nom');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');
    if (!nomInput || !emailInput || !messageInput) {
        return;
    }
    [nomInput, emailInput, messageInput].forEach(function(input) {
        input.addEventListener('input', function() {
            input.setCustomValidity('');
        });
    });
    function isContactFormValid() {
        const nom = nomInput.value.trim();
        const email = emailInput.value.trim();
        const message = messageInput.value.trim();
        nomInput.setCustomValidity('');
        emailInput.setCustomValidity('');
        messageInput.setCustomValidity('');
        if (!nom) {
            nomInput.setCustomValidity('Veuillez saisir votre nom.');
        } else if (!emailRegex.test(email)) {
            emailInput.setCustomValidity('Veuillez saisir une adresse email valide.');
        } else if (message.length < 10) {
            messageInput.setCustomValidity('Le message doit contenir au moins 10 caractères.');
        }
        return contactForm.checkValidity();
    }
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!isContactFormValid()) {
            contactForm.reportValidity();
            return;
        }
        const nom = nomInput.value.trim();
        const email = emailInput.value.trim();
        const message = messageInput.value.trim();
        const recipient = contactForm.dataset.mailto || 'contact@nina-carducci.com';
        const subject = 'Demande de contact - ' + nom;
        const body =
            'Nom: ' + nom + '\n' +
            'Email: ' + email + '\n\n' +
            'Message:\n' + message;
        const mailtoUrl =
            'mailto:' +
            encodeURIComponent(recipient) +
            '?subject=' +
            encodeURIComponent(subject) +
            '&body=' +
            encodeURIComponent(body);
        contactForm.reset();
        window.location.href = mailtoUrl;
    });
});