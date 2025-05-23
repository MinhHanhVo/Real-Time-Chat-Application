// routers/index.js
const userRouter = require('./user.router');
const viewRouter = require('./view.router');
const searchRouter = require('./search.router');
const friendRouter = require('./friend.router');
const messageRouter = require('./message.router');
const groupRouter = require('./group.router');
const conversationRouter = require('./conversation.router');

module.exports = (app) => {
    app.use('/', viewRouter);
    app.use('/api/users', userRouter);
    app.use('/api/search', searchRouter);
    app.use('/api/friends', friendRouter);
    app.use('/api/messages', messageRouter);
    app.use('/api/groups', groupRouter);
    app.use('/api/conversations', conversationRouter);
};