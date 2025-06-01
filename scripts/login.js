const prompts = require('@inquirer/prompts')
const fs = require('fs')

const LOGIN_URL = 'https://hong97.ltd/api/auth/login'

async function login() {
  const user = (
    await prompts.input({
      message: 'Enter your user:',
    })
  )
    .toString()
    .trim()

  const password = (
    await prompts.input({
      message: 'Enter your password:',
    })
  )
    .toString()
    .trim()

  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    body: JSON.stringify({
      type: 'local',
      credentials: {
        phoneNumber: user,
        password,
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await res.json()
  const token = data?.data?.token
  if (token) {
    fs.writeFileSync('cache.json', JSON.stringify({ token }, null, 2))
  }
}

module.exports = {
  login,
}
