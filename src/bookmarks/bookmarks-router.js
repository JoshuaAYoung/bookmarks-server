// require('dotenv').config();
const path = require('path')
const express = require('express');
// const uuid = require('uuid/v4');
const logger = require('../logger');
const bodyParser = express.json();
const bookmarksRouter = express.Router();
const xss = require('xss');
const BookmarksService = require('../bookmarks-service.js')

const scrubBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: xss(bookmark.url),
  description: xss(bookmark.description),
  rating: bookmark.rating,
})

bookmarksRouter
  .route('/api/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(scrubBookmark))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;

    if (!title) {
      logger.error(`Title is required`);
      return res
        .status(400)
        .send('Missing title in request body');
    }

    if (!url) {
      logger.error(`URL is required`);
      return res
        .status(400)
        .send('Missing url in request body');
    }

    if (!rating) {
      logger.error(`Rating is required`);
      return res
        .status(400)
        .send('Missing rating in request body');
    }

    const parsedRating = parseInt(rating);

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      logger.error(`Invalid rating of ${rating} was supplied`);
      return res
        .status(400)
        .send('Rating needs to be a number between 1 and 5');
    }
    const newBookmark = {
      title,
      url,
      description,
      rating: parsedRating
    }

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(`/api/bookmarks/${bookmark.id}`)
          .json(scrubBookmark(bookmark))
      })
      .catch(next)
  })

bookmarksRouter
  .route('/api/bookmarks/:id')
  .all((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getById(knexInstance, req.params.id)
      .then(bookmark => {
        console.log("im here", bookmark);

        if (!bookmark) {
          logger.info(`Bookmark with id ${req.params.id} doesn't exist.`)
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    // changed this to pass
    res.json(scrubBookmark(res.bookmark))
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.id
    )
      .then(numRowsAffected => {
        logger.info(`Bookmark with id ${req.params.id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'url', 'description' or 'rating'`
        }
      })
    }

    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.id,
      bookmarkToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = bookmarksRouter;