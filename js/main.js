var token = localStorage.getItem("token");
var devices = [];
var endpoint = 'https://api.particle.io'
var spinnerHtml = '<div class="spinner"><div></div><div></div><div></div></div>';
var products = {
  0: {
    name: 'C<span class="hidden-xs">ore</span>',
    color: '#04b5f3'
  },
  6: {
    name: 'P<span class="hidden-xs">hoton</span>',
    color: '#f3cb00'
  },
  8: {
    name: '<span class="hidden-xs">P</span>1',
    color: '#f3cb00'
  },
  10: {
    name: 'E<span class="hidden-xs">lectron</span>',
    color: '#eb543c'
  },
  88: {
    name: '<span class="hidden-xs">RB</span>D<span class="hidden-xs">uo</span>',
    color: '#f72200'
  },
  103: {
    name: 'B<span class="hidden-xs">luz</span>',
    color: '#2d6fa3'
  },
  269: {
    name: 'B<span class="hidden-xs">luzGW</span>',
    color: '#1b4564'
  },
};

function logIn() {
  var context = $('#login');

  $('.has-error', context).removeClass('has-error');
  $(context).removeClass('panel-danger');
  $('.alert', context).hide();

  if ($('#email', context).val() == '') {
    $('#email', context).parent().addClass('has-error');
    return false;
  }

  if ($('#password', context).val() == '') {
    $('#password', context).parent().addClass('has-error');
    return false;
  }

  $('input', context).prop('disabled', 'disabled');
  $('input[type=submit]', context).val('Logging in...');

  jQuery.ajax(endpoint + '/oauth/token', {
    type: 'POST',
    data: {
      'username': $('#email', context).val(),
      'password': $('#password', context).val(),
      'grant_type': 'password'
    },
    success: function(result){
      token = result.access_token;
      localStorage.setItem("token", token);
      getDevices();
      $('#login').hide();
      $('#interface').show();
    },
    error: function(result){
      $('input', context).removeProp('disabled', 'disabled');
      $(context).addClass('panel-danger');
      $('input[type=submit]', context).val('Log in');
      $('.alert', context).text(result.responseJSON.error_description).show();
      $('#password', context).val('')
    },
    beforeSend: function (xhr) {
      xhr.setRequestHeader ("Authorization", "Basic c3Bhcms6c3Bhcms=");
    }
  });

  return false;
}

function logOut() {
  localStorage.removeItem("token");
  window.location.reload();
}

function getDevices(){
  jQuery.get(endpoint + '/v1/devices', {
    'access_token': token
  }, function(result){
    devices = result;
    var devicesString = '';

    if (result.length > 0) {
      devicesString += '<table class="table table-striped">';
      for (i in result) {
        var device = result[i];

        devicesString += '<tr data-device-id="' + device['id'] + '"><td>' +
                         getProductHtml(device['product_id']) +
                         '</td><td><strong>' + device['name'] + '</strong>' + spinnerHtml +'</td>' +
                         '<td class="small"><span class="hidden-xs">' + device['id'] + '</span></td>' +
                         '<td>' + (device['connected'] ? '<span class="label label-success">O<span class="hidden-xs">NLINE</span></span>' : '') + '</td></tr>';

        getDeviceInfo(device['id']);
      }
      devicesString += '</table>';
    } else {
      devicesString = '<h5>No devices found</h5>';
    }

    $('#devices .panel-body').html(devicesString);
  });
}

function getDeviceInfo(deviceId) {
  jQuery.get(endpoint + '/v1/devices/' + deviceId, {
    'access_token': token
  }, function(result){
    $('#devices [data-device-id=' + result.id + '] .spinner').remove();

    // Show functions
    if (result.functions != null && result.functions.length > 0) {
      for (i in result.functions) {
        var func = result.functions[i];

        $('#functions tbody').append(
          '<tr><td><strong>' + func + '</strong></td>' +
          '<td>' + result.name + '</td>' +
          '<td><button class="btn btn-primary btn-xs" onclick="execute(\'' + result.id + '\', \'' + func + '\', \'\')">' +
          '<span class="hidden-xs">Call</span><span class="visible-xs-*">()</span></button></td>' +
          '<td><button class="btn btn-primary btn-xs" onclick="execute(\'' + result.id + '\', \'' + func + '\', null)">' +
          '<span class="hidden-xs">Call w/ params</span><span class="visible-xs-*">(...)</span></button></td></tr>'
        );
      }
      $('#functions').show();
    }

    // Show variables
    if (result.variables != null) {
      for (variable in result.variables) {
        var type = result.variables[variable];

        $('#variables tbody').append(
          '<tr data-device-id="' + result.id + '" data-variable-name="' + variable + '"><td><strong>' + variable + '</strong></td>' +
          '<td>' + type + '</td>' +
          '<td>' + result.name + '</td>' +
          '<td>?</td>' +
          '<td><button class="btn btn-primary btn-xs" onclick="update(\'' + result.id + '\', \'' + variable + '\')">Update</button></td></tr>'
        );
      }
      $('#variables').show();
    }
  });
}

function execute(deviceId, func, params) {
  if (params === null) params = prompt('Any parameters?');
  if (params === null) params = '';

  var deviceName = null;
  for (var i = 0; i < devices.length; i++) {
    var device = devices[i];
    if (device.id == deviceId) {
      deviceName = device.name;
    }
  }

  var row = $(
    '<tr><td><strong>' + deviceName + '-&gt;' + func + '</strong></td>' +
    '<td>' + params + '</td>' +
    '<td><div class="spinner"><div></div><div></div><div></div></div></td>' +
    '<td><button class="btn btn-primary btn-xs" onclick="execute(\'' + deviceId + '\', \'' + func + '\', \'' + params + '\')">' +
    '<span class="hidden-xs">Call</span><span class="visible-xs-*">()</span></button></td></tr>'
  );

  $('#execution-history tbody').prepend(row);
  $('#execution-history').show();

  jQuery.post(endpoint + '/v1/devices/' + deviceId + '/' + func + '/', {
    'access_token': token,
    'args': params
  }, function(result){
    $('.spinner', row).remove();
    $('td:nth-child(3)', row).text(result.return_value);
  });
}

function update(deviceId, variable) {
  var row = $('#variables [data-device-id=' + deviceId + '][data-variable-name=' + variable + ']');

  $('td:nth-child(4)', row).html('<div class="spinner"><div></div><div></div><div></div></div>');

  jQuery.get(endpoint + '/v1/devices/' + deviceId + '/' + variable + '/', {
    'access_token': token
  }, function(result){
    $('td:nth-child(4)', row).text(result.result);
  });
}

function clearHistory() {
  $('#execution-history tbody tr').remove();
}

function getProductHtml(productId) {
  if (Object.keys(products).indexOf(productId.toString()) === -1) {
    return '<span class="label label-default">Unknown</span> ';
  } else {
    var product = products[productId];
    return '<span class="label" style="background: ' + product.color + '">' +
           product.name + '</span> ';
  }
}

$(function() {
  if (token != null) {
    $('#interface').show();
    getDevices();
  } else {
    $('#login').show();
  }
});
