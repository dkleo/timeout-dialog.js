
/*
 * timeout-dialog.js v0.2.0
 *
 * @author: Derek Lords (@dkleo)
 *
 * 1.  added settings.overlay_name and settings.dialog_class, title hidden by default.
 * 2.  added settings.idle_redirect, if true, will redirect to logout_url on timeout (after no response from countdown).
 * 3.  optional header countdown (#nav_timer by default) stays in sync with timeout / keep-alive.
 */

/* String formatting used by message templates. Skip if the host already defined it.
 * Example: 'Hello {0}'.format('World');
 */
if (typeof String.prototype.format !== 'function') {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function(match, number) {
      return typeof args[number] !== 'undefined' ? args[number] : match;
    });
  };
}

!function($) {
  $.timeoutDialog = function(options) {

    var settings = {
      timeout: 7200,
      countdown: 900,
      title : 'Your session is about to expire!',
      endTitle: 'Your session has expired!',
      message : 'You will be logged out in {0} seconds.',
      question: 'Do you want to stay signed in?',
      keep_alive_button_text: 'Yes, Keep me signed in',
      keep_alive_url : 'test.cfm',
      sign_out_button_text: 'No, Sign me out',
      idle_redirect: true,
      idle_redirect_opt: 1,
      logout_url: "act_logout.cfm",
      logout_redirect_url: 'index.cfm',
      login_service:'act_login.cfm',
      restart_on_yes: true,
      dialog_width: 350,
      overlay_name:'overlay',
      dialog_class:'timeout-dialog',
      timer_el: '#nav_timer',
      timer_warning_class: 'is-warning'
    }

    $.extend(settings, options);

    var TimeoutDialog = {
      init: function () {
        this.startNavTimer();
        this.setupDialogTimer();
      },

      formatClock: function(totalSeconds) {
        var diff = Math.max(0, totalSeconds | 0);
        var hours = (diff / 3600) | 0;
        var minutes = ((diff % 3600) / 60) | 0;
        var seconds = (diff % 60) | 0;
        hours = hours < 10 ? '0' + hours : String(hours);
        minutes = minutes < 10 ? '0' + minutes : String(minutes);
        seconds = seconds < 10 ? '0' + seconds : String(seconds);
        return hours + ':' + minutes + ':' + seconds;
      },

      navTimerEl: function() {
        if (!settings.timer_el) {
          return null;
        }
        return document.querySelector(settings.timer_el);
      },

      tickNavTimer: function() {
        var display = this.navTimerEl();
        if (!display) {
          return;
        }
        var elapsed = ((Date.now() - this.navTimerStartedAt) / 1000) | 0;
        var remaining = this.navTimerDuration - elapsed;
        display.textContent = this.formatClock(remaining);
        if (settings.timer_warning_class) {
          if (remaining <= settings.countdown) {
            $(display).addClass(settings.timer_warning_class);
          } else {
            $(display).removeClass(settings.timer_warning_class);
          }
        }
      },

      startNavTimer: function() {
        var self = this;
        var display = this.navTimerEl();
        if (!display) {
          return;
        }
        this.stopNavTimer();
        this.navTimerDuration = Math.max(0, parseInt(settings.timeout, 10) || 0);
        this.navTimerStartedAt = Date.now();
        this.tickNavTimer();
        this.navTimerInterval = window.setInterval(function() {
          self.tickNavTimer();
        }, 1000);
      },

      stopNavTimer: function() {
        if (this.navTimerInterval) {
          window.clearInterval(this.navTimerInterval);
          this.navTimerInterval = null;
        }
      },

      setupDialogTimer: function() {
        var self = this;
        if (this.timeout) {
          window.clearTimeout(this.timeout);
        }
        this.timeout = window.setTimeout(function() {
           self.setupDialog();
          }, (settings.timeout - settings.countdown) * 1000);
      },

      setupDialog: function() {
        var self = this;
        self.destroyDialog();

        $('<div id="timeout-dialog" >' +
            '<p id="timeout-message" class="bs-callout bs-callout-info">' + settings.message.format('<span id="timeout-countdown">' + settings.countdown + '</span>') + '</p>' +
            '<p id="timeout-question">' + settings.question + '</p>' +
          '</div>')
        .dialog({
          options: {
              headerVisible: true
          },
          modal: true,
          width: settings.dialog_width,
          minHeight: 'auto',
          position : {
            my : 'center top', at : 'center top+10', of : window
          },
          zIndex: 10000,
          closeOnEscape: false,
          draggable: false,
          resizable: false,
          dialogClass: settings.dialog_class,
          title: settings.title,
          buttons : {
            'keep-alive-button' : {
              text: settings.keep_alive_button_text,
              id: "timeout-keep-signin-btn",
              click: function() {
                self.keepAlive();
              }
            },
            'sign-out-button' : {
              text: settings.sign_out_button_text,
              id: "timeout-sign-out-button",
              click: function() {
                self.signOut(true);
              }
            }
          }
        });

        self.startCountdown();
      },

      destroyDialog: function() {
        if ($("#timeout-dialog").length) {
          $("#timeout-dialog").dialog("close");
          $('#timeout-dialog').remove();
        }
      },

      startCountdown: function() {
        var self = this,
            counter = settings.countdown;

        this.countdown = window.setInterval(function() {
          counter -= 1;
          $("#timeout-countdown").html(counter);

          if (counter <= 0) {
            window.clearInterval(self.countdown);
            self.signOut(settings.idle_redirect);
          }

        }, 1000);
      },

      keepAlive: function() {
        var self = this;
        this.destroyDialog();
        window.clearInterval(this.countdown);

        $.get(settings.keep_alive_url, function(data) {
          if ($.trim(data) === "OK") {
            if (settings.restart_on_yes) {
                $("#{0}".format(settings.overlay_name)).hide();
                self.startNavTimer();
                self.setupDialogTimer();
            }
          }
          else {
            self.signOut(false);
          }
        });
      },

      signOut: function(is_forced) {
        var self = this;
        this.stopNavTimer();
        this.destroyDialog();

        if (settings.logout_url != null) {

            $.post(settings.logout_url, {timeout : "t"}, function(data){
                self.redirectLogout(is_forced);
            });
        }
        else {
            self.redirectLogout(is_forced);
        }
      },

      redirectLogout: function(is_forced){
        var target = settings.logout_redirect_url ;
        if (is_forced) {
          target += '?error=7';
          window.location = target;
        } else {

            $('<div id="timeout-login-dialog">' +
                '<p id="timeout-message" class="bs-callout bs-callout-info">Please enter your username and password to login.</p>' +
                '<div class="formwrap">' +
                '<form id="quickLogin"><fieldset>' +
                  '<div>' +
                    '<label for="username">' +
                        '<span class="required">' +
                            '*' +
                        '</span>' +
                        'Username:' +
                    '</label>' +
                    '<input type="text" name="username" id="username" size="50" class="required" required/>' +
                '</div>' +
                '<div>' +
                    '<label for="first_name">' +
                        ' <span class="required">' +
                            ' *' +
                            '</span>' +
                          'Password:' +
                        '</label>' +
                      '<input type="password" readonly autocomplete="off" name="password" id="password" size="50" class="required" required value="" />' +
                    '</div>' +
                '</fieldset></form>' +
                '</div>' +
              '</div>')
            .dialog({
              options: {
                  headerVisible: true
              },
              modal: true,
              width: 'auto',
              minHeight: 'auto',
              position : {
                  my : 'center top', at : 'center bottom', of : $('#header')
              },
              zIndex: 10001,
              closeOnEscape: false,
              draggable: false,
              resizable: false,
              dialogClass: settings.dialog_class,
              title: settings.title,
              buttons : [
                {
                  text: 'cancel',
                  id: "ql-cancel-btn",
                  name: "ql-cancel-btn",
                  click: function() {
                    $(this).dialog('close');
                    window.location = target;
                  }
                },
                {
                  text: 'submit',
                  class: 'btn-warning',
                  name: 'ql-submit-button',
                  id: "ql-submit-button",
                  click: function() {
                    let data = new FormData()
                    ,username = $('#quickLogin #username').val()
                    ,password = $('#quickLogin #password').val()
                    ,myDialog = $(this);

                    data.append('username', username);
                    data.append('password', password);

                    $.ajax({
                      url: settings.login_service,
                      type: 'POST',
                      data: data,
                      async: false,
                      cache: false,
                      processData: false,
                      contentType: false,
                      dataType: 'json',
                      statusCode: {
                      200: function (response) {
                          myDialog.dialog('close');
                          $("#timeout-message").html('').removeClass('bs-callout bs-callout-danger');
                          $("#timeout-message").html( 'You have been reauthenticated.' ).addClass( 'bs-callout bs-callout-success' );
                          $("#timeout-message").fadeOut(5000, function(){
                            TimeoutDialog.init();
                          });
                        }
                      }
                    });

                   }
                  }
              ],
              open: function(event, ui) {
                $('.ui-widget-overlay').css({ opacity: '.98' });
                $(this).dialog('option', 'title', settings.endTitle);
                $("#password").val('');
                $("#password").removeAttr('readonly');
                $("#password, #username").keydown(function (e) {
                  if (e.keyCode == 13) {
                    $('#ql-submit-button').trigger("click");
                  }
                });
              },
              close: function(event, ui) {
                $(this).dialog('destroy').remove();
              }
            });
        }
      }
    };
    TimeoutDialog.init();
  };
}(window.jQuery);
