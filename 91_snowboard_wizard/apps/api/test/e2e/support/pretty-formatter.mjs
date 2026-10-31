// pretty-formatter.mjs - Plugin wrapper around @cucumber/pretty-formatter's PrettyPrinter
import { PrettyPrinter } from '@cucumber/pretty-formatter'

export default {
  type: 'formatter',
  formatter({ on }) {
    const printer = new PrettyPrinter({ stream: process.stdout })
    on('message', (envelope) => printer.update(envelope))
  },
}
