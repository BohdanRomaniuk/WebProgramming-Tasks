const express = require('express');
const router = express.Router();
const pg = require('pg');
const path = require('path');
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:1234@127.0.0.1:5432/load_balancer';
//USER SESSION!!!!!!!
var sess;
var progress = 0;
var canceled = false;

//CALCULATIONS
router.post('/server/calculate', (req, res, next) => {
  sess = req.session;
  var calculation_result="";
  const input = {size: req.body.system_size, matrix: req.body.matrix, vector: req.body.vector};
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
	progress = 0;
	canceled = false;
	var size = input.size;
	var matrix = new Array(size);
	var vector = new Array(size);
	var matrix_lines = input.matrix.split("\n");
	var vector_line = input.vector.split(" ");
	for(var i=0; i<size; ++i)
	{
		matrix[i] = new Array(size);
		var matrix_line = matrix_lines[i].split(" ");
		for(var j=0; j<size; ++j)
		{
			matrix[i][j] = parseFloat(matrix_line[j]);
		}
		vector[i] = parseFloat(vector_line[i]);
	}
	
	var pr = 0;
	//Прямий хід
	for(var k=0; k<size; ++k)
	{
		++pr;
		progress = (pr/size)*100;
		console.log(progress);
		var t = new Array(size);;
		for (var i = 0; i < size; ++i)
		{
			t[i] = new Array(size);
			for(var j=0; j<size; ++j)
			{
				t[i][j]=0;
			}
			t[i][i] = 1;
		}
		t[k][k] = 1 / matrix[k][k];
		for (var i = k + 1; i < size; ++i)
		{
			t[i][k] = -matrix[i][k] / matrix[k][k];
		}
		//a=t*a
		var a_temp = new Array(size);
		for(var i=0; i<size; ++i)
		{
			a_temp[i] = new Array(size);
			for(var j=0; j<size; ++j)
			{
				a_temp[i][j] = 0;
				for(var p=0; p<size; ++p)
				{
					a_temp[i][j] += t[i][p]*matrix[p][j];
				}
			}
		}
		for(var i=0; i<size; ++i)
		{
			for(var j=0; j<size; ++j)
			{
				matrix[i][j] = a_temp[i][j];
			}
		}
		//b=t*b
		var b_vector = new Array(size);
		for(var i=0; i<size; ++i)
		{
			b_vector[i]=0;
			for(var j=0; j<size; ++j)
			{
				b_vector[i] += t[i][j]*vector[j];
			}
		}
		for(var i=0; i<size; ++i)
		{
			vector[i] = b_vector[i];
		}
	}
	for (var k = size - 1; k >= 0; --k)
	{
		var v = new Array(size);
		for (var i = 0; i < size; ++i)
		{
			v[i] = new Array(size);
			for(var j=0; j<size; ++j)
			{
				v[i][j] = 0;
			}
			v[i][i] = 1;
		}
		for (var i = 0; i < k; ++i)
		{
			v[i][k] = -matrix[i][k];
		}
		//a=v*a
		var a_temp = new Array(size);
		for(var i=0; i<size; ++i)
		{
			a_temp[i] = new Array(size);
			for(var j=0; j<size; ++j)
			{
				a_temp[i][j] = 0;
				for(var p=0; p<size; ++p)
				{
					a_temp[i][j] += v[i][p]*matrix[p][j];
				}
			}
		}
		for(var i=0; i<size; ++i)
		{
			for(var j=0; j<size; ++j)
			{
				matrix[i][j] = a_temp[i][j];
			}
		}
		//b=v*b
		var b_vector = new Array(size);
		for(var i=0; i<size; ++i)
		{
			b_vector[i]=0;
			for(var j=0; j<size; ++j)
			{
				b_vector[i] += v[i][j]*vector[j];
			}
		}
		for(var i=0; i<size; ++i)
		{
			vector[i] = b_vector[i];
		}
	}
	calculation_result+="</br><b style='color:red;'>Розвязки</b></br>";
	for(var i=0; i<size; ++i)
	{
		calculation_result+="x<sub>"+(i+1)+"</sub>="+vector[i]+"</br>";
	}
	
	
    const query = client.query('INSERT INTO tasks(username, task_system_size, task_input_matrix,task_input_vector,task_result,task_date) VALUES($1,$2,$3,$4,$5,CURRENT_DATE);', [sess.username, input.size, input.matrix, input.vector, calculation_result]);
    
    query.on('end', () => {
      done();
	  if(canceled)
	  {
		return res.json("Обрахунок було перервано");
	  }
	  else
	  {
		return res.json(calculation_result);
	  }
    });
  });
});

//GET HISTORY OF CALCULATIONS
router.get('/server/old_calculations', (req, res, next) => {
	sess=req.session;
	var results = [];
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    const query = client.query('SELECT task_id, username, task_system_size, task_input_matrix, task_input_vector, task_date FROM tasks WHERE username=$1', [sess.username]);
    query.on('row', (row) => {
		results.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//GET RESULT INFO ABOUT TASK CALCULATIONS
router.get('/server/task/:task_id', (req, res, next) => {
	sess=req.session;
	const result = [];
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    const query = client.query('SELECT task_result FROM tasks WHERE task_id=$1 LIMIT 1', [req.params.task_id]);
    query.on('row', (row) => {
		result.push(row);
    });
    query.on('end', () => {
      done();
      return res.json(result);
    });
  });
});

//GET PROGRESS PERCENTAGE STATUS
router.get('/server/progress', (req, res, next) => {
	sess=req.session;
    return res.json(progress);
});


//ABORT CURRENT TASK
router.post('/server/abort', (req, res, next)=> {
	sess=req.session;
	canceled=true;
	return res.json("Aborted");
});

//REGISTER NEW USER
router.post('/server/register', (req, res, next) => {
	var results = false;
	const data = {username: req.body.username, userpassword: req.body.userpassword, userrole: 'simple'};
	pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    client.query('INSERT INTO users(username, userpassword, userrole) values($1, $2, $3)', [data.username, data.userpassword, data.userrole]);
    const query = client.query('SELECT * FROM users WHERE username=($1) LIMIT 1', [data.username]);
    query.on('row', (row) => {
      results = true;
    });
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//USER LOGIN FORM
router.post('/server/login', (req, res, next) => {
  var isLoggined = false;
  const data = {username: req.body.username, userpassword: req.body.userpassword};
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    const query = client.query('SELECT * FROM users WHERE username=($1) AND userpassword=($2) LIMIT 1', [data.username, data.userpassword]);
    query.on('row', (row) => {
		//START SESSION
		sess=req.session;
		sess.username=req.body.username;
		sess.userrole=row.userrole;
		//START SESSION
		isLoggined = true;
    });
    query.on('end', () => {
      done();
      return res.json(isLoggined);
    });
  });
});

//USER LOGOUT FORM
router.get('/server/logout', (req, res, next) => {
	req.session.destroy(function(err){
	if(err){
		console.log(err);
	}
	else
	{
		return res.json(true);
	}
  });
});

//NAVIGATION MENU
router.get('/server/navigation', (req, res, next) => {
	sess=req.session;
	const navelements = [];
navelements.push({name: 'main', href: '/', text: 'Головна'});
	if(sess.username)
	{
		navelements.push({name: 'profile', href: 'profile.html', text: 'Профіль ['+sess.username+']'});
		if(sess.userrole=='admin')
		{
			navelements.push({name: 'admin', href: '/admin/', text: 'Панель керування'});
		}
		navelements.push({name: 'logout', href: '/logout.html', text: 'Вийти'});
	}
	else
	{
		navelements.push({name: 'login', href: 'login.html', text: 'Вхід'});
		navelements.push({name: 'register', href: 'register.html', text: 'Реєстрація'});
	}
	return res.json(navelements);
});

module.exports = router;