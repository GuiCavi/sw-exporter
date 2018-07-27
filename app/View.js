import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, hashHistory } from 'react-router';

import Layout from './pages/Layout';
import Logs from './pages/Logs';
import Realtime from './pages/Realtime';
import Settings from './pages/Settings';
import Help from './pages/Help';

ReactDOM.render(
  <Router history={hashHistory}>
    <Route path="/" component={Layout}>
      <IndexRoute component={Logs} />
      <Route path="realtime" component={Realtime} />
      <Route path="settings" component={Settings} />
      <Route path="help" component={Help} />
    </Route>
  </Router>,
  document.getElementById('app'));