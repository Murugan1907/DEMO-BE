const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require('multer');
const fs = require('fs');


// Akshaya demo port Crazy

const app = express();
const port = 5000;

const upload = multer({ dest: 'Downloads' });

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'akshaya123*',
    database: 'hospital',
  });

  const createRegistrationDataTableQuery = `
  CREATE TABLE IF NOT EXISTS patient_data (
    uhid VARCHAR(20) PRIMARY KEY,
    patient_name VARCHAR(50),
    father_name VARCHAR(50),
    date_of_birth DATE,
    age INT,
    gender VARCHAR(20),
    contact_number VARCHAR(15),
    address VARCHAR(255),
    aadhar_number VARCHAR(16),
    registration_date DATE,
    registration_fees DECIMAL(10, 2),
    registration_payment_status BOOLEAN DEFAULT false,
    place VARCHAR(255), 
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

const createConsultationDataTableQuery = `
  CREATE TABLE IF NOT EXISTS Consultation_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uhid VARCHAR(20),
    patient_name VARCHAR(50),
    department_name VARCHAR(50),
    consultation_doctor VARCHAR(50),
    consultation_fees DECIMAL(10,2),
    timings_and_date VARCHAR(1000),
    consultpayment_Status BOOLEAN DEFAULT false,
    opstatus BOOLEAN DEFAULT false,
    doctor_visit BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

const createDoctorProfileTableQuery=`
CREATE TABLE IF NOT EXISTS doctor_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id VARCHAR(255) UNIQUE,
  name VARCHAR(512),
  gender VARCHAR(255),
  age INT,
  dob DATE,
  specialist VARCHAR(255),
  qualification VARCHAR(255),
  department VARCHAR(255),
  doj DATE,
  consultant_fees INT,
  experience VARCHAR(255),
  contact_number VARCHAR(255) UNIQUE,
  address VARCHAR(255),
  day_of_week INT,
  start_time TIME,
  end_time TIME,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

const createOutPatientTable = `
CREATE TABLE IF NOT EXISTS outpatient_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uhid VARCHAR(50) NOT NULL,
  patientname VARCHAR(255) NOT NULL,
  age INT,
  contact_number VARCHAR(15),
  consultation_doctor VARCHAR(255),
  doctor_department VARCHAR(255),
  bloodpressure VARCHAR(50),
  temperature DECIMAL(5,2),
  height DECIMAL(5,2),
  weight DECIMAL(5,3),
  pastmedicalhistory TEXT,
  currentproblem TEXT,
  token INT,
  opstatus BOOLEAN DEFAULT true,
  currentdate DATE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

const createBillingTable = `
CREATE TABLE IF NOT EXISTS billing_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(255) UNIQUE,
  patientname VARCHAR(255) NOT NULL,
  uhid VARCHAR(50) NOT NULL,
  contact_number BIGINT,
  department VARCHAR(50),
  paymentmethod VARCHAR(255),
  total INT,
  gcrno BIGINT,
  file_data LONGBLOB,
  file_name VARCHAR(255),
  currentdate DATE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

function getNextUHID(callback) {
  const getLastUHIDQuery = 'SELECT MAX(SUBSTRING(uhid, 3) * 1) AS maxUHID FROM patient_data';
  db.query(getLastUHIDQuery, (error, result) => {
    if (error) {
      callback(error, null);
    } else {
      const lastUHIDNumber = result[0].maxUHID || 0;
      const nextUHIDNumber = lastUHIDNumber + 1;
      const nextUHID = 'DK' + nextUHIDNumber.toString().padStart(3, '0');
      callback(null, nextUHID);
    }
  });
}

db.getConnection((connectionError, connection) => {
  if (connectionError) {
    console.error("Database connection failed: " + connectionError.stack);
    return;
  }

  connection.query(createOutPatientTable, (error, result) => {
    if (error) {
      throw new Error("Error creating Doctor_profile table : " + error.message);
    }
    console.log("outpatient table created successfully");
  });

  connection.query(createDoctorProfileTableQuery, (error, result) => {
    if (error) {
      throw new Error("Error creating Doctor_profile table : " + error.message);
    }
    console.log("Doctor_profile table created successfully");
  });

  connection.query(createRegistrationDataTableQuery, (error, result) => {
    if (error) {
      throw new Error("Error creating Doctor_profile table : " + error.message);
    }
    console.log("Registration table created successfully");
  });

  connection.query(createConsultationDataTableQuery, (error, result) => {
    if (error) {
      throw new Error("Error creating Doctor_profile table : " + error.message);
    }
    console.log("Consultation table created successfully");
  });

  connection.query(createBillingTable, (error, result) => {
    if (error) {
      throw new Error("Error creating Doctor_profile table : " + error.message);
    }
    console.log("Billing table created successfully");
  });
});

app.get('/consultation', (req, res) => {
  const query = 'SELECT * FROM Consultation_data';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching consultation data:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error.' });
      return;
    }

    res.json({ success: true, data: results });
  });
});

app.post('/consultation-data', (req, res) => {
  const {
    uhid,
    patient_name,
    department_name,
    consultation_doctor,
    consultation_fees,
    timings_and_date,
   
  } = req.body;

  const insertQuery = `INSERT INTO Consultation_data 
    (uhid, patient_name, department_name, consultation_doctor, consultation_fees, timings_and_date) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(
    insertQuery,
    [
      uhid,
      patient_name,
      department_name,
      consultation_doctor,
      consultation_fees,
      timings_and_date,
    ],
    (err, results) => {
      if (err) {
        console.error('Error inserting consultation data:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
        return;
      }

      res.json({ success: true, message: 'Consultation data inserted successfully.' });
    }
  );
});


app.post('/patient', (req, res) => {
  db.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error("Database connection failed: " + connectionError.stack);
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const patientData = req.body;

    getNextUHID((error, nextUHID) => {
      if (error) {
        console.error("Error getting next UHID: " + error.message);
        return res.status(500).json({ error: 'Error getting next UHID' });
      }

      patientData.uhid = nextUHID;

      const insertPatientDataQuery = 'INSERT INTO patient_data SET ?';

      connection.query(insertPatientDataQuery, patientData, (error, result) => {
        if (error) {
          console.error("Error inserting data into the database: " + error.message);
          res.status(500).json({ error: 'Error inserting data into the database' });
        } else {
          console.log("Data inserted successfully");
          res.status(200).json({ uhid: nextUHID, message: 'Data inserted successfully' });
        }

        connection.release();
      });
    });
  });
});

app.get("/doctorsinfo", (req, res) => {
    const { specialist } = req.query;
    let sql = "SELECT * FROM `doctor_profile`";
  
    if (specialist) {
      sql += " WHERE specialist = ?";
    }
  
    db.query(sql, specialist, (err, results) => {
      if (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ error: "Error fetching data" });
        return;
      }
      res.json(results);
    });
  });
  
  function formatTimingsData(timingsData) {
    const daysAndTimings = timingsData.split(', '); 
    const formattedTimings = {};
  
    daysAndTimings.forEach(dayAndTiming => {
      const [dayName, timing] = dayAndTiming.split(':');
      formattedTimings[dayName.trim()] = timing.trim();
    });
  
    return JSON.stringify(formattedTimings);
  }
  
  app.post('/addDoctor', async (req, res) => {
    try {
      const {
        name,
        gender,
        age,
        dob,
        specialist,
        qualification,
        department,
        doj,
        consultant_fees,
        experience,
        contact_number,
        address,
        day_of_week,
        start_time,
        end_time,
      } = req.body;
  
      // Generate the next doctor_id
      const getLastDoctorIDQuery =
        'SELECT MAX(CAST(SUBSTRING(doctor_id, 3) AS UNSIGNED)) as lastDoctorID FROM doctor_profile';
  
      const lastDoctorIDResult = await new Promise((resolve, reject) => {
        db.query(getLastDoctorIDQuery, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result[0].lastDoctorID || 0);
          }
        });
      });
  
      const nextDoctorID = `DR${String(lastDoctorIDResult + 1).padStart(3, '0')}`;
  
      // Check for duplicate contact_number
      const checkDuplicateDoctorQuery = 'SELECT * FROM doctor_profile WHERE contact_number = ?';
  
      const duplicateResult = await new Promise((resolve, reject) => {
        db.query(checkDuplicateDoctorQuery, [contact_number], (checkErr, checkResult) => {
          if (checkErr) {
            reject(checkErr);
          } else {
            resolve(checkResult);
          }
        });
      });
  
      if (duplicateResult && duplicateResult.length > 0) {
        res.status(400).json({ error: 'Doctor with this contact number already exists' });
        return;
      }
  
      // Insert the new doctor
      const insertDoctorQuery = `
        INSERT INTO doctor_profile 
        (doctor_id, name, gender, age, dob, specialist, qualification, department, doj, consultant_fees, experience, contact_number, address, day_of_week, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
  
      db.query(
        insertDoctorQuery,
        [
          nextDoctorID,
          name,
          gender,
          age,
          dob,
          specialist,
          qualification,
          department,
          doj,
          consultant_fees,
          experience,
          contact_number,
          address,
          day_of_week,
          start_time,
          end_time,
        ],
        (insertErr, insertResult) => {
          if (insertErr) {
            console.error('Error inserting data:', insertErr);
            res.status(500).json({ error: 'Error inserting data' });
            return;
          }
  
          res.json({ message: 'Doctor added successfully', doctor_id: nextDoctorID });
        }
      );
    } catch (error) {
      console.error('Error inserting data:', error);
      res.status(500).json({ error: 'Error inserting data' });
    }
  });


  app.get("/departments", (req, res) => {
    db.query("SELECT DISTINCT department AS department FROM `doctor_profile`", (err, results) => {
      if (err) {
        console.error("Error fetching departments:", err);
        res.status(500).json({ error: "Error fetching departments" });
        return;
      }
      res.json(results);
    });
  });


app.put('/update-registration_payment/:uhid', (req, res) => {
    const { uhid } = req.params;
  
    const query = 'UPDATE hospital.patient_data SET registration_payment_status = true WHERE uhid = ?';
  
    db.query(query, [uhid], (err, result) => {
      if (err) {
        console.error('Error updating payment status:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
        return;
      }
  
      if (result.affectedRows > 0) {
        res.json({ success: true, message: 'Payment status updated successfully.' });
      } else {
        res.status(404).json({ success: false, message: 'Record not found.' });
      }
    });
  });


  app.put('/update-consultation_payment/:uhid', (req, res) => {
    const { uhid } = req.params;
  
    const query = 'UPDATE hospital.Consultation_data SET consultpayment_status = true WHERE uhid = ?';
  
    db.query(query, [uhid], (err, result) => {
      if (err) {
        console.error('Error updating payment status:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
        return;
      }
  
      if (result.affectedRows > 0) {
        res.json({ success: true, message: 'Payment status updated successfully.' });
      } else {
        res.status(404).json({ success: false, message: 'Record not found.' });
      }
    });
  });


  app.put('/update-consultation_status/:uhid', (req, res) => {
    const { uhid } = req.params;
  
    const query = 'UPDATE hospital.Consultation_data SET doctor_visit = true WHERE uhid = ?';
  
    db.query(query, [uhid], (err, result) => {
      if (err) {
        console.error('Error updating payment status:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
        return;
      }
  
      if (result.affectedRows > 0) {
        res.json({ success: true, message: 'Payment status updated successfully.' });
      } else {
        res.status(404).json({ success: false, message: 'Record not found.' });
      }
    });
  });


  app.get('/unpaid-patients', (req, res) => {
    const query = `
      SELECT 
        pd.uhid, 
        pd.patient_name, 
        pd.date_of_birth, 
        pd.age, 
        pd.gender, 
        pd.contact_number, 
        pd.address, 
        pd.aadhar_number, 
        pd.registration_date, 
        pd.registration_payment_status,
        cd.department_name, 
        cd.consultation_fees, 
        pd.registration_fees, 
        cd.consultation_doctor,
        cd.consultpayment_Status  
      FROM 
        patient_data pd
      LEFT JOIN 
        Consultation_data cd ON pd.uhid = cd.uhid
      WHERE 
        (pd.registration_payment_status = 0 OR (pd.registration_payment_status = 1 AND cd.consultpayment_Status = 0))`;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching unpaid patients:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
        return;
      }
  
      res.json({ success: true, data: results });
    });
  });



  app.get('/paid-patients', (req, res) => {
    const query = `
    SELECT 
      pd.uhid, 
      pd.patient_name, 
      pd.date_of_birth, 
      pd.age, 
      pd.gender, 
      pd.contact_number, 
      pd.address, 
      pd.aadhar_number, 
      pd.registration_date, 
      pd.registration_payment_status, 
      cd.department_name, 
      cd.consultation_fees, 
      pd.registration_fees, 
      cd.consultation_doctor,
      cd.consultpayment_Status 
    FROM 
      patient_data pd
    LEFT JOIN 
      Consultation_data cd ON pd.uhid = cd.uhid
    WHERE 
      (pd.registration_payment_status = 1 AND cd.consultpayment_Status = 1 AND cd.opstatus = 0 AND cd.doctor_visit = 0)`;
  
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching unpaid patients:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
        return;
      }
  
      res.json({ success: true, data: results });
    });
  });


  app.post('/addOutpatientRecord', (req, res) => {
    const {
        uhid,
        patientName,
        age,
        contact_number,
        consultation_doctor,
        doctor_department,
        height,
        bloodPressure,
        weight,
        temperature,
        currentProblem,
        pastmedicalhistory,
    } = req.body;

    const record = {
        uhid,
        patientName,
        age,
        contact_number,
        consultation_doctor,
        doctor_department,
        height,
        bloodPressure,
        weight,
        temperature,
        currentProblem,
        pastmedicalhistory,
    };

    const currentDate = new Date().toISOString().split('T')[0]; 
    const maxTokenQuery = 'SELECT MAX(token) AS maxToken FROM outpatient_table WHERE currentdate = ?';
    db.query(maxTokenQuery, [currentDate], (err, result) => {
        if (err) {
            console.error('Error fetching maximum token:', err);
            res.status(500).json({ error: 'Error fetching maximum token' });
        } else {
            const maxToken = result[0].maxToken || 0; 
            const token = maxToken + 1; 

            record.token = token;
            record.currentdate = currentDate;

            const query = 'INSERT INTO outpatient_table SET ?';
            db.query(query, record, (err, result) => {
                if (err) {
                    console.error('Error inserting record:', err);
                    res.status(500).json({ error: 'Error inserting record' });
                } else {
                    console.log('Record inserted successfully');
                    res.status(200).json({ message: 'Outpatient record added successfully' });
                }
            });
        }
    });
});


  
app.put('/update-opstatus/:uhid', (req, res) => {
    const { uhid } = req.params;
  
    const query = 'UPDATE Consultation_data SET opstatus = true WHERE uhid = ?';
  
    db.query(query, [uhid], (err, result) => {
      if (err) {
        console.error('Error updating payment status:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
        return;
      }
  
      if (result.affectedRows > 0) {
        res.json({ success: true, message: 'Op status updated successfully.' });
      } else {
        res.status(404).json({ success: false, message: 'Record not found.' });
      }
    });
  });

app.get('/outpatient-data', (req, res) => {
    const query = 'SELECT * FROM outpatient_table';

    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching outpatient data:', err);
            res.status(500).json({ success: false, message: 'Internal Server Error.' });
            return;
        }

        if (result && result.length > 0) {
            res.json({ success: true, data: result });
        } else {
            res.status(404).json({ success: false, message: 'No data found.' });
        }
    });
});

async function generateInvoiceNumber() {
  const currentDate = new Date();

  const year = currentDate.getFullYear().toString().slice(2); 
  const month = String(currentDate.getMonth() + 1).padStart(2, "0"); 
  const day = String(currentDate.getDate()).padStart(2, "0"); 

  const getLastInvoiceNumberQuery = `SELECT MAX(CAST(SUBSTRING(invoice_number, 7) AS UNSIGNED)) as lastInvoiceNumber 
                                     FROM Billing_table `;

  const lastInvoiceNumberResult = await new Promise((resolve, reject) => {
    db.query(getLastInvoiceNumberQuery, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0].lastInvoiceNumber || 0);
      }
    });
  });

  // Extracting the numeric part of the last invoice number and incrementing it
  const lastNumber = lastInvoiceNumberResult % 10000; // considering only the last 4 digits
  const nextInvoiceNumber = `HMS${year}${month}${day}${String(lastNumber + 1).padStart(4, "0")}`;
  return nextInvoiceNumber;
}


app.post('/billing-data', async (req, res) => { 
  const invoicenumber = await generateInvoiceNumber();

  const {
    patientname,
    uhid,
    contact_number,
    department,
    paymentmethod,
    total,
    gcrno,
  } = req.body;

  const currentDate = new Date().toISOString().split('T')[0];

  const sql = 'INSERT INTO billing_table SET ?';

  if (department === 'Registration,Consultation') {
    const regInvoiceNumber = await generateInvoiceNumber();
    const conInvoiceNumber = await generateInvoiceNumber();

    const regData = {
      invoice_number: regInvoiceNumber,
      patientname,
      uhid,
      contact_number,
      department: 'Registration',
      paymentmethod,
      total: selectedPatient.registration_fees,
      gcrno,
      currentdate: currentDate
    };

    const conData = {
      invoice_number: conInvoiceNumber,
      patientname,
      uhid,
      contact_number,
      department: 'Consultation',
      paymentmethod,
      total: selectedPatient.consultation_fees,
      gcrno,
      currentdate: currentDate
    };

    db.query(sql, regData, (regErr, regResult) => {
      if (regErr) {
        console.error('Error inserting registration data:', regErr);
        res.status(500).json({ error: 'Error inserting registration data' });
      } else {
        console.log('Registration data inserted successfully:', regResult);
        db.query(sql, conData, (conErr, conResult) => {
          if (conErr) {
            console.error('Error inserting consultation data:', conErr);
            res.status(500).json({ error: 'Error inserting consultation data' });
          } else {
            console.log('Consultation data inserted successfully:', conResult);
            res.status(200).json({ message: 'Data inserted successfully' });
          }
        });
      }
    });
  } else {
    const insertData = {
      invoice_number: invoicenumber,
      patientname,
      uhid,
      contact_number,
      department,
      paymentmethod,
      total,
      gcrno,
      currentdate: currentDate
    };

    db.query(sql, insertData, (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ error: 'Error inserting data' });
      } else {
        console.log('Result:', result);
        res.status(200).json({ message: 'Data inserted successfully', invoiceNumber: insertData.invoice_number });

      }
    });
  }
});

app.post('/upload-pdf', upload.single('pdfFile'), (req, res) => {
  const pdfPath = req.file.path; 
  const pdfName = req.file.originalname; 
  const { uhid, payment_method } = req.body; 
console.log ("datas",uhid,payment_method);
console.log ("pdf",pdfPath,pdfName);

  fs.readFile(pdfPath, (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('Error reading file');
    } else {
      const updateQuery = 'UPDATE billing_table SET file_data = ?, file_name = ? WHERE uhid = ? AND paymentmethod = ?';

      db.query(updateQuery, [data, pdfName, uhid, payment_method], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating PDF in the database:', updateErr);
          res.status(500).send('Error updating PDF in the database');
        } else {
          if (updateResult.affectedRows > 0) {
            console.log('PDF updated successfully in the database');
            res.status(200).send('PDF updated successfully');
          } else {
            console.log('No matching record found for uhid and payment_method');
            res.status(404).send('No matching record found for uhid and payment_method');
          }
        }
      });
    }
  });
});



app.get('/billing_history', (req, res) => {
  const query = 'SELECT * FROM billing_table';
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


app.get('/get-gcr-number/:paymentType', (req, res) => {
  const { paymentType } = req.params;

  let gcrNumber = '';
  if (paymentType === 'Cash') {
    gcrNumber = generateGCRForCash();
  } else if (paymentType === 'Online') {
    gcrNumber = generateGCRForOnline();
  } else {
    return res.status(400).json({ error: 'Invalid payment type' });
  }

  return res.json({ gcrNumber });
});

function generateGCRForCash() {
  
  return 1234567890;
}

function generateGCRForOnline() {
 
  return 9876543210;
}


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

