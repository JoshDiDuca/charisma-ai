import type { Configuration } from 'electron-builder'

import {
  main,
  name,
  version,
  resources,
  description,
  displayName,
  author as _author,
} from './package.json'

import { getDevFolder } from './src/lib/electron-app/release/utils/path'

const author = _author?.name ?? _author
const currentYear = new Date().getFullYear()
const authorInKebabCase = author.replace(/\s+/g, '-')
const appId = `com.${authorInKebabCase}.${name}`.toLowerCase()

const artifactName = [`${name}-v${version}`, '-${os}.${ext}'].join('')

export default {
  appId,
  productName: displayName,
  copyright: `Copyright © ${currentYear} — ${author}`,

  directories: {
    app: getDevFolder(main),
    output: `dist/v${version}`,
  },

   extraResources: [
    {
      "from": "./resources/${os}/bin/",
      "to": "./bin/",
      "filter": ["**/*"]
    },
    {
      "from": "./resources/logo.png",
      "to": "./logo.png",
      "filter": ["**/*"]
    }
  ],
  mac: {
    artifactName,
    icon: `${resources}/logo.png`,
    category: 'public.app-category.utilities',
    target: ['zip', 'dmg', 'dir'],
  },

  linux: {
    artifactName,
    category: 'Utilities',
    synopsis: description,
    target: ['AppImage', 'deb', 'pacman', 'freebsd', 'rpm'],
  },

  win: {
    artifactName,
    icon: `${resources}/logo.png`,
    target: [
      'nsis',
      'dir'
    ],
    requestedExecutionLevel: "requireAdministrator"
  },
} satisfies Configuration
