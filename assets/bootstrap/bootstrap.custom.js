(function(window, document, $) {
  'use strict';

  var modalInstances = new WeakMap();
  var carouselInstances = new WeakMap();

  function resolveTarget(trigger) {
    var selector = trigger.getAttribute('data-bs-target') || trigger.getAttribute('href');
    if (!selector || selector === '#') {
      return null;
    }
    try {
      return document.querySelector(selector);
    } catch (error) {
      return null;
    }
  }

  function dispatchJqueryEvent(element, name, detail) {
    if (!$) {
      return { prevented: false };
    }
    var event = $.Event(name, detail || {});
    $(element).trigger(event);
    return { prevented: event.isDefaultPrevented() };
  }

  function getFocusableElements(container) {
    var selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.prototype.slice.call(container.querySelectorAll(selector)).filter(function(element) {
      return !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null;
    });
  }

  function Modal(element) {
    this.element = element;
    this.isShown = false;
    this.lastFocused = null;
    this.hadTabIndex = element.hasAttribute('tabindex');
    this.onKeydown = this.onKeydown.bind(this);
    this.onBackdropClick = this.onBackdropClick.bind(this);
  }

  Modal.prototype.focusInitialElement = function() {
    var focusable = getFocusableElements(this.element);
    var target = focusable[0] || this.element;
    target.focus();
  };

  Modal.prototype.onKeydown = function(event) {
    if (event.key === 'Escape') {
      this.hide();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    var focusable = getFocusableElements(this.element);
    if (!focusable.length) {
      event.preventDefault();
      this.element.focus();
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;

    if (event.shiftKey && (active === first || active === this.element)) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  Modal.prototype.onBackdropClick = function(event) {
    if (event.target === this.element) {
      this.hide();
    }
  };

  Modal.prototype.show = function(relatedTarget) {
    if (this.isShown) {
      return;
    }

    var showEvent = dispatchJqueryEvent(this.element, 'show.bs.modal', {
      relatedTarget: relatedTarget || null
    });
    if (showEvent.prevented) {
      return;
    }

    this.isShown = true;
    this.lastFocused = document.activeElement;

    this.element.style.display = 'block';
    this.element.removeAttribute('aria-hidden');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('role', 'dialog');
    if (!this.hadTabIndex) {
      this.element.setAttribute('tabindex', '-1');
    }
    document.body.classList.add('modal-open');

    window.requestAnimationFrame(function() {
      this.element.classList.add('show');
      this.focusInitialElement();
      dispatchJqueryEvent(this.element, 'shown.bs.modal', {
        relatedTarget: relatedTarget || null
      });
    }.bind(this));

    this.element.addEventListener('click', this.onBackdropClick);
    document.addEventListener('keydown', this.onKeydown);
  };

  Modal.prototype.hide = function() {
    if (!this.isShown) {
      return;
    }

    var hideEvent = dispatchJqueryEvent(this.element, 'hide.bs.modal');
    if (hideEvent.prevented) {
      return;
    }

    this.isShown = false;
    this.element.classList.remove('show');

    window.setTimeout(function() {
      this.element.style.display = 'none';
      this.element.setAttribute('aria-hidden', 'true');
      this.element.removeAttribute('aria-modal');
      this.element.removeAttribute('role');
      if (!this.hadTabIndex) {
        this.element.removeAttribute('tabindex');
      }
      document.body.classList.remove('modal-open');
      dispatchJqueryEvent(this.element, 'hidden.bs.modal');

      if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
        this.lastFocused.focus();
      }
    }.bind(this), 150);

    this.element.removeEventListener('click', this.onBackdropClick);
    document.removeEventListener('keydown', this.onKeydown);
  };

  Modal.prototype.toggle = function(relatedTarget) {
    if (this.isShown) {
      this.hide();
    } else {
      this.show(relatedTarget);
    }
  };

  function getOrCreateModal(element) {
    var instance = modalInstances.get(element);
    if (!instance) {
      instance = new Modal(element);
      modalInstances.set(element, instance);
    }
    return instance;
  }

  function Carousel(element) {
    this.element = element;
    this.items = Array.prototype.slice.call(element.querySelectorAll('.carousel-item'));
    this.intervalId = null;
    this.isSliding = false;
    this.defaultInterval = Number(element.getAttribute('data-bs-interval')) || 5000;

    this.handlePointer = this.handlePointer.bind(this);

    this.element.addEventListener('mouseenter', this.pause.bind(this));
    this.element.addEventListener('mouseleave', this.cycle.bind(this));
    this.element.addEventListener('dragstart', this.handlePointer);

    if (element.getAttribute('data-bs-ride') === 'carousel') {
      this.cycle();
    }
  }

  Carousel.prototype.handlePointer = function(event) {
    if (event.target && event.target.tagName === 'IMG') {
      event.preventDefault();
    }
  };

  Carousel.prototype.getActiveIndex = function() {
    return this.items.findIndex(function(item) {
      return item.classList.contains('active');
    });
  };

  Carousel.prototype.updateIndicators = function(index) {
    var indicatorContainer = this.element.querySelector('.carousel-indicators');
    if (!indicatorContainer) {
      return;
    }

    var indicators = indicatorContainer.querySelectorAll('[data-bs-slide-to]');
    indicators.forEach(function(indicator, i) {
      if (i === index) {
        indicator.classList.add('active');
        indicator.setAttribute('aria-current', 'true');
      } else {
        indicator.classList.remove('active');
        indicator.removeAttribute('aria-current');
      }
    });
  };

  Carousel.prototype.to = function(index) {
    var current = this.getActiveIndex();
    if (current < 0 || index < 0 || index >= this.items.length || index === current || this.isSliding) {
      return;
    }

    var direction = index > current ? 'next' : 'prev';
    this.slide(index, direction);
  };

  Carousel.prototype.next = function() {
    var current = this.getActiveIndex();
    var nextIndex = (current + 1) % this.items.length;
    this.slide(nextIndex, 'next');
  };

  Carousel.prototype.prev = function() {
    var current = this.getActiveIndex();
    var nextIndex = (current - 1 + this.items.length) % this.items.length;
    this.slide(nextIndex, 'prev');
  };

  Carousel.prototype.slide = function(nextIndex, direction) {
    if (this.isSliding) {
      return;
    }

    var currentIndex = this.getActiveIndex();
    if (currentIndex < 0 || nextIndex === currentIndex) {
      return;
    }

    var active = this.items[currentIndex];
    var next = this.items[nextIndex];

    this.isSliding = true;

    var directionalClass = direction === 'next' ? 'carousel-item-next' : 'carousel-item-prev';
    var orderClass = direction === 'next' ? 'carousel-item-start' : 'carousel-item-end';
    var transitionMs = 600;

    this.updateIndicators(nextIndex);

    next.classList.add(directionalClass);
    next.offsetWidth;
    active.classList.add(orderClass);
    next.classList.add(orderClass);

    window.setTimeout(function() {
      active.classList.remove('active', directionalClass, orderClass);
      next.classList.remove(directionalClass, orderClass);
      next.classList.add('active');
      this.isSliding = false;
    }.bind(this), transitionMs);
  };

  Carousel.prototype.pause = function() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  };

  Carousel.prototype.cycle = function() {
    this.pause();
    this.intervalId = window.setInterval(this.next.bind(this), this.defaultInterval);
  };

  function getOrCreateCarousel(element) {
    var instance = carouselInstances.get(element);
    if (!instance) {
      instance = new Carousel(element);
      carouselInstances.set(element, instance);
    }
    return instance;
  }

  function initCarousels() {
    var carousels = document.querySelectorAll('.carousel');
    carousels.forEach(function(carousel) {
      getOrCreateCarousel(carousel);
    });
  }

  document.addEventListener('click', function(event) {
    var modalToggle = event.target.closest('[data-bs-toggle="modal"]');
    if (modalToggle) {
      var modalTarget = resolveTarget(modalToggle);
      if (modalTarget) {
        event.preventDefault();
        getOrCreateModal(modalTarget).toggle(modalToggle);
      }
      return;
    }

    var slideTrigger = event.target.closest('[data-bs-slide], [data-bs-slide-to]');
    if (!slideTrigger) {
      return;
    }

    var target = resolveTarget(slideTrigger) || slideTrigger.closest('.carousel');
    if (!target) {
      return;
    }

    event.preventDefault();

    var carousel = getOrCreateCarousel(target);
    var to = slideTrigger.getAttribute('data-bs-slide-to');
    if (to !== null) {
      carousel.to(Number(to));
      return;
    }

    var action = slideTrigger.getAttribute('data-bs-slide');
    if (action === 'prev') {
      carousel.prev();
    } else {
      carousel.next();
    }
  });

  if ($) {
    $.fn.modal = function(action) {
      return this.each(function() {
        var modal = getOrCreateModal(this);
        if (action === 'hide') {
          modal.hide();
        } else if (action === 'toggle') {
          modal.toggle();
        } else {
          modal.show();
        }
      });
    };
  }

  document.addEventListener('DOMContentLoaded', initCarousels);
})(window, document, window.jQuery);
