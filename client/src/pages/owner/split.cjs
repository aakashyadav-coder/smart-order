const fs = require('fs')
const path = require('path')

const dir = __dirname
const srcFile = path.join(dir, 'OwnerTabComponents.jsx')
const lines = fs.readFileSync(srcFile, 'utf8').split('\n')

// The imports block is lines 0 to 16
const imports = lines.slice(4, 17).join('\n')

// We will write out helpers up to line 232
const helpersLines = lines.slice(17, 232)
// Insert exports for helpers
const helpersContent = `// ownerTabHelpers.jsx
${imports}

${helpersLines.join('\n')}

export { downloadCSV, useCountUp, BarChart, LineChart, DonutChart, StatCard, TopItems }
`
fs.writeFileSync(path.join(dir, 'ownerTabHelpers.jsx'), helpersContent, 'utf8')

// AnalyticsTab is lines 233 to 332
const analyticsLines = lines.slice(232, 333)
const analyticsContent = `// AnalyticsTab.jsx
${imports}
import { downloadCSV, StatCard, LineChart, DonutChart, TopItems } from './ownerTabHelpers'

${analyticsLines.join('\n')}
`
fs.writeFileSync(path.join(dir, 'AnalyticsTab.jsx'), analyticsContent, 'utf8')

// OrderHistoryTab is lines 333 to 585
const orderHistoryLines = lines.slice(333, 585)
const orderHistoryContent = `// OrderHistoryTab.jsx
${imports}
import { downloadCSV } from './ownerTabHelpers'

${orderHistoryLines.join('\n')}
`
fs.writeFileSync(path.join(dir, 'OrderHistoryTab.jsx'), orderHistoryContent, 'utf8')

// MenuTab is lines 585 to 686
const menuLines = lines.slice(585, 686)
const menuContent = `// MenuTab.jsx
${imports}

${menuLines.join('\n')}
`
fs.writeFileSync(path.join(dir, 'MenuTab.jsx'), menuContent, 'utf8')

// QRTab is lines 686 to 721
const qrLines = lines.slice(686, 722)
const qrContent = `// QRTab.jsx
${imports}

${qrLines.join('\n')}
`
fs.writeFileSync(path.join(dir, 'QRTab.jsx'), qrContent, 'utf8')

// SupportTab is lines 722 to 832
const supportLines = lines.slice(722, 833)
const supportContent = `// SupportTab.jsx
${imports}

${supportLines.join('\n')}
`
fs.writeFileSync(path.join(dir, 'SupportTab.jsx'), supportContent, 'utf8')

// StaffTab is lines 833 to 862
const staffLines = lines.slice(833, 862)
const staffContent = `// StaffTab.jsx
${imports}

${staffLines.join('\n')}
`
fs.writeFileSync(path.join(dir, 'StaffTab.jsx'), staffContent, 'utf8')

// Create barrel file (replacing OwnerTabComponents.jsx)
const barrelContent = `// Barrel export for OwnerTab components
export { AnalyticsTab } from './AnalyticsTab'
export { OrderHistoryTab } from './OrderHistoryTab'
export { MenuTab } from './MenuTab'
export { QRTab } from './QRTab'
export { SupportTab } from './SupportTab'
export { StaffTab } from './StaffTab'
`
fs.writeFileSync(srcFile, barrelContent, 'utf8')

console.log('Successfully split OwnerTabComponents.jsx into 8 files!')
