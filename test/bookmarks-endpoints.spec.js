require('dotenv').config()
const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, testMaliciousBookmark } = require('./bookmarks.fixtures')

describe('Bookmarks Endpoints', function () {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconect from db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  describe(`GET /bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })

    context('Given an XSS attack article', () => {
      const { maliciousBookmark, expectedBookmark } = testMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert([maliciousBookmark])
      })
      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/bookmarks`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
          })
      })
    })
  })
  describe(`POST /bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function () {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        description: 'this is a test bookmark',
        rating: 4
      }
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
        })
        .then(res =>
          supertest(app)
            .get(`/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        )
    })

    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = testMaliciousBookmark()

      return supertest(app)
        .post(`/bookmarks`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
    })

    const requiredFields = ['title', 'url', 'rating']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        rating: '4'
      }

      it(`responds with 400 and an error message when the ${field} is missing`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, `Missing ${field} in request body`
          )
      })
    })

    it('responds with 400 and an error message when rating is not a number', () => {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        description: 'this is a test bookmark',
        rating: 'four'
      }

      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(400, 'Rating needs to be a number between 1 and 5')
    })

    it('responds with 400 and an error message when rating is a number over 5', () => {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        description: 'this is a test bookmark',
        rating: 7
      }

      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(400, 'Rating needs to be a number between 1 and 5')
    })
  })

  describe('Delete /bookmarks/:id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds 404 when bookmark does not exist`, () => {
        return supertest(app)
          .delete(`/bookmarks/123`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark doesn't exist` }
          })
      })

      context(`Given bookmarks are in the database`, () => {
        // might need to check destructure
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmarks')
            .insert(testBookmarks)
        })

        it(`deletes the bookmark by ID`, () => {
          const testBookmarks = makeBookmarksArray()
          const deleteID = 9
          const expectedBookmarks = testBookmarks.filter(mark => mark.id !== deleteID)
          return supertest(app)
            .delete(`/bookmarks/${deleteID}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(204)
            .then(() =>
              supertest(app)
                .get(`/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(expectedBookmarks)
            )
        })
      })
    })
    // end brack
  })
})