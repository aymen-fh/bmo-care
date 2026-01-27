const {
  ensureAuthenticated,
  ensureGuest,
  ensureRole,
  ensureAdmin,
  ensureSuperAdmin,
  ensureSpecialist,
  redirectByRole,
} = require('../middleware/auth');

function makeReq({ isAuth = false, role = 'specialist' } = {}) {
  return {
    isAuthenticated: () => isAuth,
    user: isAuth ? { role } : undefined,
    flash: jest.fn(),
  };
}

function makeRes() {
  return {
    redirect: jest.fn(),
  };
}

describe('auth middleware - unit', () => {
  test('ensureAuthenticated redirects to /auth/login when not authenticated', () => {
    const req = makeReq({ isAuth: false });
    const res = makeRes();
    const next = jest.fn();

    ensureAuthenticated(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
  });

  test('ensureAuthenticated allows request when authenticated', () => {
    const req = makeReq({ isAuth: true, role: 'specialist' });
    const res = makeRes();
    const next = jest.fn();

    ensureAuthenticated(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('ensureRole blocks when role not allowed', () => {
    const req = makeReq({ isAuth: true, role: 'specialist' });
    const res = makeRes();
    const next = jest.fn();

    ensureRole('admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalled();
    // specialist role redirects to /specialist
    expect(res.redirect).toHaveBeenCalledWith('/specialist');
  });

  test('ensureAdmin allows admin and superadmin', () => {
    const res1 = makeRes();
    const next1 = jest.fn();
    ensureAdmin(makeReq({ isAuth: true, role: 'admin' }), res1, next1);
    expect(next1).toHaveBeenCalledTimes(1);

    const res2 = makeRes();
    const next2 = jest.fn();
    ensureAdmin(makeReq({ isAuth: true, role: 'superadmin' }), res2, next2);
    expect(next2).toHaveBeenCalledTimes(1);
  });

  test('ensureSuperAdmin blocks non-superadmin', () => {
    const req = makeReq({ isAuth: true, role: 'admin' });
    const res = makeRes();
    const next = jest.fn();

    ensureSuperAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/admin');
  });

  test('ensureSpecialist allows specialist/admin/superadmin', () => {
    for (const role of ['specialist', 'admin', 'superadmin']) {
      const res = makeRes();
      const next = jest.fn();
      ensureSpecialist(makeReq({ isAuth: true, role }), res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  test('ensureGuest redirects authenticated users by role', () => {
    const req = makeReq({ isAuth: true, role: 'superadmin' });
    const res = makeRes();
    const next = jest.fn();

    ensureGuest(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/superadmin');
  });

  test('redirectByRole defaults to /auth/login when unknown', () => {
    const req = { user: { role: 'something-else' } };
    const res = makeRes();

    redirectByRole(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
  });
});
