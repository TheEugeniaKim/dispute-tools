/* global fetch, FormData */

// quick helper
export function req(opts, cb) {
  opts.headers = opts.headers || {};

  opts.credentials = 'include';
  opts.headers.Accept = 'application/json';

  if (!(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  if (opts.method === 'get') {
    delete opts.method;
    delete opts.body;
  }

  function end(error, result) {
    try {
      cb(error, result);
    } catch (e) {
      console.log(e.stack);
    }
  }

  const request = fetch(opts.url, opts).then(res => (res.status !== 204 ? res.json() : undefined));

  if (typeof cb === 'function') {
    request
      .then(body =>
        end(null, {
          body,
          headers: body.headers,
        }),
      )
      .catch(end);
    return undefined;
  }

  // Allows for not passing in `cb` and getting a promise back.
  return request;
}

/**
 * Collection of 'application/json' endpoints we are allowed to use to
 * communicate with the server.
 */

/**
 * Updates a dispute data.
 * @param {Object} args - the arguments needed to hit an endpoint.
 * @param {string} args.disputeId - dispute’s id to update its data.
 * @param {Object} [args.body={}] - the request body.
 * @param {string} args.body.command - one of
 *  ['setForm', 'setDisputeProcess']
 * @param {function} [callback] - the callback that handles the response.
 */
export function updateDisputeData(args, callback) {
  if (!args || !args.disputeId) {
    throw new Error('Missing required params');
  }

  return req(
    {
      url: `/disputes/${args.disputeId}/update-dispute-data`,
      method: 'put',
      body: args.body || {},
    },
    callback,
  );
}

/**
 * @typedef {{ name: string, id: string }} AdminInfo
 */

/**
 * Get the list of admins (with id and name) not currently assigned to
 * the passed in dispute
 * @param {string} disputeId ID of the dispute to get the admins not assigned to
 * @return {Promise<{ available: AdminInfo[], assigned: AdminInfo[] }>}
 *      List of admins with name and id
 */
export function getAvailableAndAssignedAdmins(disputeId) {
  return req({
    url: `/admin/disputes/${disputeId}/admins`,
    method: 'get',
  });
}

export function updateAdmins(disputeId, adminIds) {
  return req({
    url: `/admin/disputes/${disputeId}/admins`,
    method: 'post',
    body: adminIds,
  });
}

export function login(url) {
  return req({
    url,
    method: 'post',
    body: {
      returnTo: window.location.pathname,
    },
  }).then(({ redirect }) => {
    window.location = redirect;
  });
}

export function uploadAttachment(dispute, form) {
  return req({
    method: 'post',
    url: `/disputes/${dispute.id}/attachment`,
    body: form,
  });
}

export function getDispute(disputeId) {
  return req({
    method: 'get',
    url: `/admin/disputes/${disputeId}`,
  });
}
