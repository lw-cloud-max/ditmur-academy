// Student Migration Script for Ditmur Academy
// Run: node scripts/import-students.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const students = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle commas in names by using a simple split (assuming no commas in names)
    const values = line.split(',');
    
    if (values.length >= 5) {
      const student = {
        useralias: values[0]?.trim(),
        fullname: values[1]?.trim(),
        email: values[2]?.trim(),
        role: values[3]?.trim(),
        class: values[4]?.trim() || '',
        category: values[5]?.trim() || '',
        phone: values[6]?.trim() || '',
        classarm: values[7]?.trim() || ''
      };
      
      if (student.useralias && student.fullname) {
        students.push(student);
      }
    }
  }

  return students;
}

// Extract first and last name from fullname
function extractNames(fullname) {
  const parts = fullname.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

// Generate a default date of birth (placeholder)
function generateDOB() {
  const year = 2010 + Math.floor(Math.random() * 8); // 2010-2017
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month - 1, day);
}

// Main import function
async function importStudents() {
  try {
    console.log('🚀 Starting student import...\n');

    // Read CSV file
    const csvPath = path.join(__dirname, '../uploads/LMS Student List (1).xlsx.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      console.log('Please place your CSV file in the uploads folder');
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const students = parseCSV(csvContent);

    console.log(`📊 Found ${students.length} students in CSV\n`);

    // Get unique classes
    const uniqueClasses = [...new Set(students.map(s => s.class).filter(c => c))];
    console.log(`📚 Classes found: ${uniqueClasses.join(', ')}\n`);

    // Create classes if they don't exist
    console.log('Creating classes...');
    for (const className of uniqueClasses) {
      try {
        await prisma.class.upsert({
          where: { name: className },
          update: {},
          create: {
            name: className,
            level: className.includes('SS') ? 'SECONDARY' : 
                   className.includes('JS') ? 'JUNIOR' : 
                   className.includes('PRI') ? 'PRIMARY' : 
                   className.includes('NUR') ? 'NURSERY' : 
                   className.includes('KG') ? 'KINDERGARTEN' : 
                   className.includes('REC') ? 'RECEPTION' : 
                   className.includes('PREP') ? 'PREP' : 'OTHER'
          }
        });
        console.log(`  ✅ ${className}`);
      } catch (error) {
        console.log(`  ⚠️  ${className} (already exists or error)`);
      }
    }

    console.log('\n');

    // Import students
    console.log('Importing students...');
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const studentData of students) {
      try {
        const { firstName, lastName } = extractNames(studentData.fullname);
        
        // Check if student already exists
        const existingStudent = await prisma.student.findUnique({
          where: { id: studentData.useralias }
        });

        if (existingStudent) {
          console.log(`  ⚠️  Skipped: ${studentData.fullname} (already exists)`);
          skipped++;
          continue;
        }

        // Create or find parent (using email as unique identifier)
        let parent = null;
        if (studentData.email) {
          // Extract parent email (use student email as placeholder)
          const parentEmail = studentData.email;
          
          parent = await prisma.parent.findFirst({
            where: { email: parentEmail }
          });

          if (!parent) {
            // Create parent account
            parent = await prisma.parent.create({
              data: {
                fullName: `${firstName}'s Parent`, // Placeholder
                email: parentEmail,
                phone: studentData.phone || '',
                password: 'parent123' // Default password
              }
            });
          }
        }

        // Get class ID if class exists
        let classId = null;
        if (studentData.class) {
          const classRecord = await prisma.class.findUnique({
            where: { name: studentData.class }
          });
          if (classRecord) {
            classId = classRecord.id;
          }
        }

        // Create student
        await prisma.student.create({
          data: {
            id: studentData.useralias,
            firstName: firstName,
            lastName: lastName,
            dob: generateDOB(), // Placeholder - update manually later
            gender: 'Male', // Placeholder - update manually later
            classId: classId,
            parentId: parent?.id || null,
            status: 'ACTIVE',
            password: 'student123' // Default password
          }
        });

        console.log(`  ✅ ${studentData.fullname} (${studentData.useralias})${classId ? ` → ${studentData.class}` : ' → Unassigned'}`);
        imported++;

      } catch (error) {
        console.error(`  ❌ Error importing ${studentData.fullname}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Imported: ${imported} students`);
    console.log(`⚠️  Skipped: ${skipped} students (already existed)`);
    console.log(`❌ Errors: ${errors} students`);
    console.log(`📚 Classes created: ${uniqueClasses.length}`);
    console.log('='.repeat(50));

    if (imported > 0) {
      console.log('\n🎉 Import successful!');
      console.log('\n📝 Next steps:');
      console.log('1. Update student dates of birth (currently placeholder)');
      console.log('2. Update student genders (currently placeholder)');
      console.log('3. Update parent names and phone numbers');
      console.log('4. Assign students without classes to their correct classes');
      console.log('\n💡 Default passwords:');
      console.log('   Students: student123');
      console.log('   Parents: parent123');
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importStudents();
