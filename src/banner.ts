import pc from 'picocolors'

const ASCII_BANNER = `
 ██████╗ █████╗ ███████╗
██╔════╝██╔══██╗██╔════╝
██║     ███████║███████╗
██║     ██╔══██║╚════██║
╚██████╗██║  ██║███████║
 ╚═════╝╚═╝  ╚═╝╚══════╝
`

export function printBanner(): void {
  console.log(pc.cyan(ASCII_BANNER))
  console.log(pc.dim('  Composable AI Stack CLI\n'))
}
