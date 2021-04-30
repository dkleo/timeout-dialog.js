
/*
 * timeout-dialog.js v1.1.1, 04-30-2021
 *
 * @author: Derek Lords (@dkleo)
 * 
 * 1.  added settings.overlay_name and settings.dialog_class, title hidden by default.
 * 
 
 */




/*
 * timeout-dialog.js v1.0.1, 01-03-2012
 *
 * @author: Rodrigo Neri (@rigoneri)
 *
 * (The MIT License)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */





!function($) {
  $.timeoutDialog = function(options) {

    var settings = {
      timeout: 12,
      countdown: 6,
      title : 'Your session is about to expire!',
      message : 'You will be logged out in {0} seconds.',
      question: 'Do you want to stay signed in?',
      keep_alive_button_text: 'Yes, Keep me signed in',
      keep_alive_url : 'test.cfm',
      sign_out_button_text: 'No, Sign me out',
      logout_url: "act_logout.cfm",
      logout_redirect_url: 'index.cfm',
      restart_on_yes: true,
      dialog_width: 350,
      overlay_name:'overlay',
      dialog_class:'timeout-dialog'
    }

    $.extend(settings, options);

    var TimeoutDialog = {
      init: function () {
        this.setupDialogTimer();
      },

      setupDialogTimer: function() {
        var self = this;
        window.setTimeout(function() {
           self.setupDialog();
          }, (settings.timeout - settings.countdown) * 1000);
      },

      setupDialog: function() {
        var self = this;
        self.destroyDialog();

        $('<div id="timeout-dialog">' +
            '<p id="timeout-message" class="bs-callout bs-callout-info">' + settings.message.format('<span id="timeout-countdown">' + settings.countdown + '</span>') + '</p>' +
            '<p id="timeout-question">' + settings.question + '</p>' +
          '</div>')
        .dialog({
          options: {
              headerVisible: false
          },          
          modal: false,
          width: settings.dialog_width,
          minHeight: 'auto',
          position : {
              my : 'center top', at : 'center bottom', of : $('#header')
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
            self.signOut(true);
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
        this.destroyDialog();

        if (settings.logout_url != null) {
            $.post(settings.logout_url, function(data){
                self.redirectLogout(is_forced);
            });
        }
        else {
            self.redirectLogout(is_forced);
        }
      },

      redirectLogout: function(is_forced){
        var target = settings.logout_redirect_url ;
        if (is_forced)
          target += '&timeout=t';
        window.location = target;
      }
    };

    TimeoutDialog.init();
  };
}(window.jQuery);
