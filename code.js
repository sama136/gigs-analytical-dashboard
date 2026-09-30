// ============================================
// CONFIGURATION
// ============================================
const SPREADSHEET_ID = '16Nhu5bpohoYIyII8fw_J4nzkC25g6xodKhGVlUBkAL0'; 

const ORIGINAL_STUDENTS_NAME = 'OG students data';
const PLATFORM_STUDENTS_NAME = 'platform students';
const GIGS_DATA_NAME = 'gigs';

const TARGET_GIGS = 3;
const TARGET_VALUE = 15;
const EXCEPTIONAL_GIG_VALUE = 300;

// ============================================
// WEB APP ENTRY POINT
// ============================================
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Gigs Analytics Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// DATA FETCHING
// ============================================
function getDashboardData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const originalData = getSheetDataFast(ss, ORIGINAL_STUDENTS_NAME);
  const platformData = getSheetDataFast(ss, PLATFORM_STUDENTS_NAME);
  const gigsData = getSheetDataFast(ss, GIGS_DATA_NAME);
  
  // DEBUG: Log platform data headers
  if (platformData.length > 0) {
    console.log('Platform Data Headers:', Object.keys(platformData[0]));
    console.log('First platform student:', JSON.stringify(platformData[0]));
  }
  
  return processAllDataUltraFast(originalData, platformData, gigsData);
}

function getSheetDataFast(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j] !== '') {
        obj[headers[j]] = row[j] || '';
      }
    }
    result.push(obj);
  }
  return result;
}

// ============================================
// DATA PROCESSING WITH INSTRUCTORS
// ============================================
function processAllDataUltraFast(originalData, platformData, gigsData) {
  const studentMap = new Map();
  
  // Variables for sidebar totals
  let totalGigsOverall = 0; 
  let totalGigsApproved = 0; 
  let totalGigsRejected = 0; 
  let totalGigsPending = 0; 

  // Total Students counted ONLY from OG students data by unique emails
  const emailSet = new Set();
  originalData.forEach(s => {
    const email = (s.email || s.Email || '').toString().trim();
    if (email) emailSet.add(email);
  });
  const totalStudents = emailSet.size;

  // Create a Set of OG student emails for filtering later
  const ogEmailSet = new Set();
  originalData.forEach(s => {
    const email = (s.email || s.Email || '').toString().trim().toLowerCase();
    if (email) ogEmailSet.add(email);
  });

  // === PROCESS ORIGINAL STUDENTS ===
  for (let i = 0; i < originalData.length; i++) {
    const s = originalData[i];
    const email = (s.email || s.Email || s.studentemail || s['student email'] || '').toLowerCase().trim();
    const name = (s.fullname || s.Fullname || s['Full Name'] || s.studentname || s['student name'] || s.name || '').trim();
    const key = email || name.toLowerCase().replace(/\s/g, '_');
    
    // === GET INSTRUCTOR FROM OG SHEET ===
    const trainer = (s.trainer || s['trainer'] || s.instructor || s['instructor'] || '').trim() || 'Unknown';
    
    if (key) {
      studentMap.set(key, {
        email: email || key, 
        studentName: name || key, 
        program: s.program || s.Program || s['Program Type'] || '',
        trainer: trainer,
        gigs15Plus: 0, 
        gigs300Plus: 0, 
        totalGigs: 0, 
        totalValue: 0, 
        has300Plus: false,
        approvedGigs: 0, 
        rejectedGigs: 0,
        graduated: false,
        onPlatform: false, 
        graduateType: '', 
        finalStatus: '', 
        coachingCompany: '',
        providerStatusCounts: { approved: 0, rejected: 0, pending: 0, other: 0 },
        auditorStatusCounts: { approved: 0, rejected: 0, pending: 0, other: 0 },
        approvedGigsValue: 0,
        isFromOG: true
      });
    }
  }
  
  // === PROCESS PLATFORM STUDENTS ===
  for (let i = 0; i < platformData.length; i++) {
    const s = platformData[i];
    const email = (s.email || s.Email || s.studentemail || s['student email'] || '').toLowerCase().trim();
    const name = (s.fullname || s.Fullname || s['Full Name'] || s['full name'] || s.name || '').trim();
    const key = email || name.toLowerCase().replace(/\s/g, '_');
    
    if (key) {
      const student = studentMap.get(key);
      
      // Get graduateType - EXACT column name matching
      let gradType = (s['graduate type'] || s.graduatetype || s.graduate_type || s.GraduateType || '').toString().trim();
      const finalStatus = (s['final status'] || s.finalstatus || s.status || '').toString().trim();
      
      const platformTotalGigs = parseInt(s['total gigs'] || s.totalgigs || s.total || s['gigs total'] || 0);
      const platformApprovedGigs = parseInt(s['approved gigs'] || s.approvedgigs || s.approved || s['gigs approved'] || 0);
      const platformTotalRevenue = parseFloat(s['total revenue'] || s.totalrevenue || s.revenue || 0);
      
      totalGigsOverall += platformTotalGigs;

      if (student) {
        student.onPlatform = true;
        student.totalGigs = platformTotalGigs;
        student.approvedGigs = platformApprovedGigs;
        student.totalValue = platformTotalRevenue;
        student.coachingCompany = s['coaching company'] || s.coachingcompany || s['Coaching Company'] || '';
        if (gradType) {
          student.graduateType = gradType;
        }
        student.finalStatus = finalStatus;
      } else {
        studentMap.set(key, {
          email: email || key, 
          studentName: name || key, 
          program: s['program type'] || s.programtypetrack || s['Program Type'] || '',
          trainer: 'Unknown',
          gigs15Plus: 0, 
          gigs300Plus: 0,
          totalGigs: platformTotalGigs, 
          totalValue: platformTotalRevenue,
          has300Plus: false, 
          onPlatform: true, 
          graduateType: gradType || '', 
          finalStatus: finalStatus || '',
          coachingCompany: s['coaching company'] || s.coachingcompany || s['Coaching Company'] || '',
          approvedGigs: platformApprovedGigs, 
          rejectedGigs: 0,
          graduated: false,
          providerStatusCounts: { approved: 0, rejected: 0, pending: 0, other: 0 },
          auditorStatusCounts: { approved: 0, rejected: 0, pending: 0, other: 0 },
          approvedGigsValue: 0,
          isFromOG: false
        });
      }
    }
  }
  
  // === PROCESS GIGS DATA ===
  for (let i = 0; i < gigsData.length; i++) {
    const g = gigsData[i];
    if (!g || Object.keys(g).length === 0) continue;
    
    let email = (g.studentemail || g['student email'] || g.email || g.Email || '').toLowerCase().trim();
    if (!email) {
      const name = (g.studentname || g['student name'] || g.name || '').trim();
      if (name) email = name.toLowerCase().replace(/\s/g, '_');
    }
    
    const gigStatus = (g.status || '').toString().toLowerCase().trim();
    const price = parseFloat(g.price || 0);
    
    if (gigStatus === 'approved' || gigStatus.includes('approve')) {
      totalGigsApproved += 1;
    } else if (gigStatus === 'rejected' || gigStatus.includes('reject')) {
      totalGigsRejected += 1;
    } else {
      totalGigsPending += 1;
    }

    if (email) {
      const student = studentMap.get(email);
      
      if (student) {
        if (gigStatus === 'approved' || gigStatus.includes('approve')) {
          student.approvedGigsValue += price;
        }
        
        if (price > 0) {
          if (price >= TARGET_VALUE) student.gigs15Plus += 1;
          if (price >= EXCEPTIONAL_GIG_VALUE) { 
            student.gigs300Plus += 1; 
            student.has300Plus = true; 
          }
          if (!student.onPlatform) { 
            student.totalGigs += 1; 
            student.totalValue += price; 
          }
        }
        
        const provStatus = (g.providerstatus || '').toString().toLowerCase().trim();
        if (provStatus.includes('approve')) {
          student.providerStatusCounts.approved += 1;
        } else if (provStatus.includes('reject')) {
          student.providerStatusCounts.rejected += 1;
        } else if (provStatus.includes('pend')) {
          student.providerStatusCounts.pending += 1;
        } else if (provStatus) {
          student.providerStatusCounts.other += 1;
        }
        
        if (!student.coachingCompany) {
          student.coachingCompany = g.coachingcompany || g['coaching company'] || '';
        }
      }
    }
  }
  
  // === CALCULATE GRADUATION & INSTRUCTOR STATS ===
  const students = Array.from(studentMap.values());
  const graduated = [];
  const notGraduated = [];
  const companyMap = new Map();
  const programMap = new Map();
  const gradTypeMap = new Map();
  const instructorMapFinal = new Map();
  
  // Track graduate types for debugging
  const gradTypeCounts = {};
  
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    let grad = false;
    
    const isFromOG = s.isFromOG === true || ogEmailSet.has(s.email);
    
    // Get graduateType
    let graduateType = s.graduateType || '';
    
    // Track counts for debugging
    const key = graduateType || 'EMPTY';
    gradTypeCounts[key] = (gradTypeCounts[key] || 0) + 1;
    
    // Check graduation criteria - count as graduated if NOT "Not Graduated"
    const gradTypeLower = (graduateType || '').toString().trim().toLowerCase();
    
    if (gradTypeLower === 'not graduated') {
      grad = false;
    } else {
      // Any other value (including empty) counts as graduated
      grad = true;
    }
    
    s.graduated = grad;
    
    if (isFromOG) {
      if (grad) {
        graduated.push(s);
      } else {
        notGraduated.push(s);
      }
    }
    
    if (isFromOG) {
      const trainer = s.trainer || 'Unknown';
      if (!instructorMapFinal.has(trainer)) {
        instructorMapFinal.set(trainer, {
          name: trainer,
          totalStudents: 0,
          totalGraduates: 0,
          totalValue: 0,
          graduationRate: 0,
          approvedGigsRevenue: 0
        });
      }
      const instData = instructorMapFinal.get(trainer);
      instData.totalStudents += 1;
      instData.totalValue += s.totalValue;
      instData.approvedGigsRevenue += s.approvedGigsValue || 0;
      if (grad) instData.totalGraduates += 1;
    }
    
    const gradType = graduateType || 'Unknown';
    gradTypeMap.set(gradType, (gradTypeMap.get(gradType) || 0) + 1);
    
    const company = s.coachingCompany || 'Unknown';
    if (!companyMap.has(company)) {
      companyMap.set(company, { 
        totalStudents: 0, 
        totalGraduates: 0, 
        totalValue: 0 
      });
    }
    const cData = companyMap.get(company);
    cData.totalStudents += 1;
    cData.totalValue += s.totalValue;
    if (grad) cData.totalGraduates += 1;
    
    const program = s.program || 'Unknown';
    if (!programMap.has(program)) {
      programMap.set(program, { 
        totalStudents: 0, 
        totalGraduates: 0, 
        totalValue: 0 
      });
    }
    const pData = programMap.get(program);
    pData.totalStudents += 1;
    pData.totalValue += s.totalValue;
    if (grad) pData.totalGraduates += 1;
  }
  
  // DEBUG: Log graduate type distribution
  console.log('=== GRADUATE TYPE DISTRIBUTION ===');
  console.log('Graduate Type Counts:', JSON.stringify(gradTypeCounts, null, 2));
  console.log('Total OG Students:', totalStudents);
  console.log('Graduated:', graduated.length);
  console.log('Not Graduated:', notGraduated.length);
  console.log('Sum:', graduated.length + notGraduated.length);
  console.log('Expected Not Graduated:', totalStudents - graduated.length);
  
  // === CALCULATE INSTRUCTOR GRADUATION RATES ===
  const instructorRanking = Array.from(instructorMapFinal.entries())
    .map(([name, data]) => ({
      name,
      ...data,
      graduationRate: data.totalStudents > 0 
        ? Number(((data.totalGraduates / data.totalStudents) * 100).toFixed(1)) 
        : 0,
      approvedGigsRevenue: Number(data.approvedGigsRevenue.toFixed(2))
    }))
    .filter(inst => inst.name !== 'Unknown' && inst.totalStudents > 0)
    .sort((a, b) => b.graduationRate - a.graduationRate);
  
  const totalGraduates = graduated.length;
  const totalNotGraduated = notGraduated.length;
  
  // === RANKINGS ===
  const topByValue = [...graduated]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);
  
  const topByApprovedGigs = [...graduated]
    .sort((a, b) => b.approvedGigs - a.approvedGigs)
    .slice(0, 10);
  
  const companyRanking = Array.from(companyMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.totalGraduates - a.totalGraduates)
    .slice(0, 10);
  
  const programRanking = Array.from(programMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.totalGraduates - a.totalGraduates)
    .slice(0, 10);
  
  const gradTypeRanking = Array.from(gradTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .filter(item => item.type.toLowerCase() !== 'unknown' && item.type.toLowerCase() !== '')
    .sort((a, b) => b.count - a.count);

  // === RETURN DATA ===
  return {
    totalStudents,
    totalGraduates,
    totalNotGraduated,
    totalOnPlatform: students.filter(s => s.onPlatform).length,
    graduationRate: totalStudents > 0 ? (totalGraduates / totalStudents) * 100 : 0,
    
    totalValue: students.reduce((sum, s) => sum + s.totalValue, 0),
    totalGigs: totalGigsOverall,
    totalGigsApproved: totalGigsApproved,
    totalGigsRejected: totalGigsRejected,
    totalGigsPending: totalGigsPending,
    
    topByValue, 
    topByApprovedGigs,
    companyRanking, 
    programRanking,
    gradTypeRanking,
    
    instructorRanking
  };
}
