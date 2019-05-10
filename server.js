// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments': {
    'POST': createComment
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};

function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

function extractFieldOrDefaultValue(requestField) {
  var vote = [];

  if (requestField) {
    vote = requestField;
  }
  return vote;
}

function createCommentFromRequest(request) {

  var upvotedBy = extractFieldOrDefaultValue(request.body.comment.upvotedBy);
  var downvotedBy =  extractFieldOrDefaultValue(request.body.comment.downvotedBy);

  if (request.body.comment.downvotedBy) {
    downvotedBy = request.body.comment.downvotedBy;
  }
  const comment = {
    id: database.nextCommentId,
    body: request.body.comment.body,
    username: request.body.comment.username,
    articleId: request.body.comment.articleId,
    upvotedBy: upvotedBy,
    downvotedBy: downvotedBy
  }
  return comment;
}

function updateCommentFromRequest(id, request) {

  var upvotedBy = extractFieldOrDefaultValue(request.body.comment.upvotedBy);
  var downvotedBy =  extractFieldOrDefaultValue(request.body.comment.downvotedBy);

  const comment = database.comments[id];

  if (database.comments[comment.id]) {
    database.comments[comment.id].body = request.body.comment.body;
  }
  return comment;
}

function determineResponseCodeForCreateComment(request) {
    if (request.body) {
      if (request.body.comment &&
          request.body.comment.body &&
          request.body.comment.username &&
          request.body.comment.articleId &&
          database.users[request.body.comment.username] &&
          database.articles[request.body.comment.articleId]) {
          return 201;
      }
    }
    return 400;
}

function determineResponseCodeForUpdateComment(id, request) {
  if (request.body && request.body.comment && id) {
    if (request.body.comment.body &&
        database.comments[id]) {
        return 200;
    }
    else {
      return 404;
    }
  }
  return 400;
}

function determineResponseCodeForDeleteComment(id) {
  if (database.comments[id] === undefined) {
    return 404;
  }
  return 204;
}

function determineResponseCodeForCommentVote(id, request) {
  if (request.body && request.body.username && database.users[request.body.username] && database.comments[id]) {
    return 200;
  }
  else return 400;
}

function createCommentInDatabase(comment) {
    database.comments[comment.id] = comment;
    database.nextCommentId++;
    database.users[comment.username].commentIds.push(comment.id);
    const article = database.articles[comment.articleId];
    article.commentIds.push(comment.id);
}

function createComment(url, request) {
  const response = {
    status: determineResponseCodeForCreateComment(request),
    body: {}
  };
  if (response.status === 400) {
    return response;
  }
  const comment = createCommentFromRequest(request);

  createCommentInDatabase(comment);

  response.body.comment = comment;
  return response;
}

function extractCommentIDFromURL(url) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  if (id.length != 0) {
    return id;
  }
}

function updateComment(url, request) {
  id = extractCommentIDFromURL(url);
  const response = {
    status: determineResponseCodeForUpdateComment(id, request),
    body: {}
  };
  if (response.status != 200) {
    return response;
  }
  var comment = updateCommentFromRequest(id, request);
  response.body.comment = comment;
  return response;
}

function deleteComment(url) {
  const id = extractCommentIDFromURL(url);
  const response = {
    status: determineResponseCodeForDeleteComment(id)
  };
  if (response.status === 404) {return response}

  let comment = database.comments[id]

  let user = database.users[comment.username];
  let commentIDIndex = user.commentIds.indexOf(id);
  user.commentIds.splice(commentIDIndex, 1);

  let article = database.articles[comment.articleId];
  let articleCommentIDIndex = article.commentIds.indexOf(id);
  article.commentIds.splice(articleCommentIDIndex, 1);

  database.comments[id] = null;
  return response;
}

function upvoteComment(url, request) {
  const id = extractCommentIDFromURL(url);
  const response = {
    status: determineResponseCodeForCommentVote(id, request),
    body: {}
  };
  if (response.status === 400) {
    return response;
  }
  const username = request.body.username;
  let comment = database.comments[id];
  comment = upvote(comment, username);

  response.body.comment = comment;

  return response;
}


function downvoteComment(url, request) {
  const id = extractCommentIDFromURL(url);
  const response = {
    status: determineResponseCodeForCommentVote(id, request),
    body: {}
  };
  if (response.status === 400) {
    return response;
  }
  const username = request.body.username;
  let comment = database.comments[id];
  comment = downvote(comment, username);

  response.body.comment = comment;

  return response;
}
// Write all code above this line.

const http = require('http');
const url = require('url');
const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});