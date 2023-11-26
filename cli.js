#!/usr/bin/env node

import chalk from 'chalk'
import path from 'path'
import fs from 'fs'
import { input } from '@inquirer/prompts'
import { Command } from 'commander'
import select from '@inquirer/select'
import {execa, execaCommand} from 'execa'
import ora from 'ora'
import childProcess from 'child_process'

const log = console.log
const program = new Command()
const green = chalk.green

const isYarnInstalled = () => {
  try {
    childProcess.execSync('yarn --version');
    return true;
  } catch {
    return false; 
  }
}

const isBunInstalled = () => {
  try {
    childProcess.execSync('bun --version')
    return true;
  } catch(err) {
    return false; 
  }
}

async function main() {
  const spinner = ora({
    text: 'Creating codebase'
  })
  try {
    const kebabRegez = /^([a-z]+)(-[a-z0-9]+)*$/

    program
      .name('Create Lens App')
      .description('Create a new social app with a single command.')
      .option('-t, --type <type of app>', 'Set the app type as basic or PWA')
  
    program.parse(process.argv)
  
    const options = program.opts()
    const args = program.args
    let type = options.type
    let appName = args[0]
  
    if (!appName || !kebabRegez.test(args[0])) {
      appName = await input({
        message: 'Enter your app name',
        default: 'lens-app',
        validate: d => {
         if(!kebabRegez.test(d)) {
          return 'please enter your app name in the format of my-app-name'
         }
         return true
        }
      })
    }
  
    if (
      !options.type ||
      (
        options.type !== 'basic' &&
        options.type !== 'pwa' &&
        options.type !== 'opinionated'
      )
    ) {
      type = await select({
        message: 'Select an app type',
        choices: [
          {
            name: 'basic',
            value: 'basic',
            description: 'Basic responsive Lens web app configured with WalletConnect and ShadCN UI',
          },
          {
            name: 'opinionated',
            value: 'opinionated',
            description: 'More opinionated, responsive Lens web app configured with WalletConnect and ShadCN UI',
          },
          {
            name: 'PWA (Progressive Web App)',
            value: 'pwa',
            description: 'PWA Lens app configured with WalletConnect and ShadCN UI',
          }
        ]
      })
    }
  
    let repoUrl = 'https://github.com/dabit3/lens-boilerplate'

    if (type === 'opinionated') {
      repoUrl = 'https://github.com/dabit3/lens-shadcn'
    }

    if (type === 'pwa') {
      repoUrl = 'https://github.com/dabit3/lens-pwa'
    }

    log(`\nInitializing project with template: ${chalk.cyan(type)} \n`)

    if (!isBunInstalled()) {
log(`
Installing dependencies:
- ${chalk.cyan(`next`)}
- ${chalk.cyan(`react`)}
- ${chalk.cyan(`@radix-ui`)}
- ${chalk.cyan(`lucide-react`)}
- ${chalk.cyan(`tailwindcss`)}
- ${chalk.cyan(`viem`)}
- ${chalk.cyan(`wagmi`)}
- ${chalk.cyan(`@web3modal/react`)}
- ${chalk.cyan(`@web3modal/ethereum`)}
- ${chalk.cyan(`@lens-protocol/react-web`)}
- ${chalk.cyan(`@lens-protocol/wagmi`)}
- ${chalk.cyan(`@lens-protocol/widgets-react`)}
`)
    }

    spinner.start()
    await execa('git', ['clone', repoUrl, appName])
    if (type === 'pwa') {
      await execa('ls')
      await execa('cd', [appName], '&&', 'git', ['branch', '-m', 'walletconnect', 'main'])
      await execa('cd', [appName], '&&', 'git', ['remote', 'rm', 'origin'])
    }    

    let packageJson = fs.readFileSync(`${appName}/package.json`, 'utf8')
    const packageObj = JSON.parse(packageJson)
    packageObj.name = appName
    packageJson = JSON.stringify(packageObj, null, 2)
    fs.writeFileSync(`${appName}/package.json`, packageJson)

    process.chdir(path.join(process.cwd(), appName))
    spinner.text = ''
    let startCommand = ''

    if (isBunInstalled()) {
      spinner.text = 'Installing dependencies'
      await execaCommand('bun install').pipeStdout(process.stdout)
      spinner.text = ''
      startCommand = 'bun dev'
      console.log('\n')
    } else if (isYarnInstalled()) {
      await execaCommand('yarn').pipeStdout(process.stdout)
      startCommand = 'yarn dev'
    } else {
      spinner.text = 'Installing dependencies'
      await execa('npm', ['install', '--verbose']).pipeStdout(process.stdout)
      spinner.text = ''
      startCommand = 'npm run dev'
    }
    spinner.stop() 
    log(`${green.bold('Success!')} Created ${appName} at ${process.cwd()} \n`)
    log(`To get started, change into the new directory and run ${chalk.cyan(startCommand)}`)
  } catch (err) {
    console.log(err);
    log('\n')
    if (err.exitCode == 128) {
      log('Error: directory already exists.')
    }
    spinner.stop()
  }
}
main()