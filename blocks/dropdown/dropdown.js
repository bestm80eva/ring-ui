define(['jquery', 'global/global__views', 'global/global__modules', 'global/global__utils'], function($, View, Module, utils) {
  'use strict';

  var COMPONENT_SELECTOR = '.ring-js-dropdown';
  var TOGGLE_SELECTOR = '.ring-dropdown-toggle';
  var ITEM_SELECTOR = '.ring-menu__item';
  var INNER_SELECTOR = '.ring-dropdown__i';

  var $global = $(window);
  var $body;
  var $dropdown;
  var target;

  var MIN_RIGHT_PADDING = 8;
  var TOP_PADDING = 4;

  var create = function(data, $target) {
    var currentTarget = $target[0];
    var sameTarget = (currentTarget && target === currentTarget);

    if (!data) {
      data = $target.data('ring-dropdown');
    }

    remove();

    if (data && !sameTarget) {
      target = currentTarget;

      if (data instanceof $ || utils.isNode(data)) {
        $dropdown = $(View.render('dropdown', ''));

        $dropdown.find(INNER_SELECTOR).append(data);
      } else {

        if (typeof data === 'object' && !data.html) {
          data = {items: data};
        }

        if (typeof data === 'string') {
          data = {html: data};
        }

        $dropdown = $(View.render('dropdown', data));
      }

      if (!$body) {
        $body = $('body');
      }

      $dropdown.appendTo($body);

      var menuToggle;
      var targetToggle = $target.is(TOGGLE_SELECTOR);
      if (targetToggle && $target.prev().is(ITEM_SELECTOR)) {
        menuToggle = true;
        $target = $target.prev();
      }

      var pos = $target.offset();
      var targetCenter = pos.left + $target.outerWidth() / 2;
      var targetWidth = $target.is(':input') ? $target.outerWidth() : $target.width();

      var dropdownWidth = $dropdown.width();
      var dropdownCenter = dropdownWidth / 2;

      // Right aligment
      if (pos.left + dropdownWidth > $global.width() - MIN_RIGHT_PADDING) {
        pos.left += targetWidth - dropdownWidth;

      // Center aligment on toggle without menu item
      } else if(targetCenter >= dropdownCenter && targetToggle && !menuToggle) {
        pos.left = targetCenter - dropdownCenter;
      }

      pos.top += $target.outerHeight() + TOP_PADDING;

      if (dropdownWidth < targetWidth) {
        pos.width = targetWidth;
      }

      $dropdown.css(pos);

      Module.get('dropdown').trigger('show:done');
      return false;
    } else {
      Module.get('dropdown').trigger('show:fail');
      return true;
    }
  };

  var remove = function() {
    if ($dropdown) {
      $dropdown.remove();
      $dropdown = null;

      target = null;

      Module.get('dropdown').trigger('hide:done');
      return true;
    } else {
      Module.get('dropdown').trigger('hide:fail');
      return false;
    }
  };

  // Using delegate because of compatibility with YouTrack's jQuery 1.5.1
  $(document).delegate('*','click.ring.dropdown', function(e) {
    return create(null, $(e.currentTarget).closest(COMPONENT_SELECTOR));
  });

  // Remove on resize
  $global.resize(remove);

  // Public methods
  Module.add('dropdown', {
    show: {
      method: create,
      override: true
    },
    hide: {
      method: remove,
      override: true
    }
  });
});