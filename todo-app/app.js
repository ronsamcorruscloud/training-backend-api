const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const app = express();

const dataFile = path.join(__dirname, 'todos.json');

// Enable CORS for all origins
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Todo API',
            version: '1.0.0',
            description: 'A simple Todo API with file-based storage',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
    },
    apis: ['./app.js'], // files containing annotations
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Ensure the todos.json file exists
async function initializeDataFile() {
    try {
        await fs.access(dataFile);
    } catch {
        // If file doesn't exist, create it with empty array
        await fs.writeFile(dataFile, JSON.stringify([]));
    }
}

// Read todos from file
async function readTodos() {
    const data = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(data);
}

// Write todos to file
async function writeTodos(todos) {
    await fs.writeFile(dataFile, JSON.stringify(todos, null, 2));
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Todo:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the todo
 *         title:
 *           type: string
 *           description: The title of the todo
 *         description:
 *           type: string
 *           description: Detailed description of the todo
 *         completed:
 *           type: boolean
 *           description: Whether the todo is completed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the todo was created
 */

/**
 * @swagger
 * /todos:
 *   get:
 *     summary: Returns all todos
 *     responses:
 *       200:
 *         description: The list of todos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 */
app.get('/todos', async (req, res) => {
    try {
        const todos = await readTodos();
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read todos' });
    }
});

/**
 * @swagger
 * /todos/{id}:
 *   get:
 *     summary: Get a todo by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The todo id
 *     responses:
 *       200:
 *         description: The todo description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       404:
 *         description: The todo was not found
 */
app.get('/todos/:id', async (req, res) => {
    try {
        const todos = await readTodos();
        const todo = todos.find(t => t.id === parseInt(req.params.id));
        if (!todo) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        res.json(todo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read todo' });
    }
});

/**
 * @swagger
 * /todos:
 *   post:
 *     summary: Create a new todo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the todo
 *               description:
 *                 type: string
 *                 description: Detailed description of the todo
 *     responses:
 *       201:
 *         description: The created todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 */
app.post('/todos', async (req, res) => {
    try {
        const todos = await readTodos();
        const newTodo = {
            id: todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1,
            title: req.body.title,
            description: req.body.description || '',
            completed: false,
            createdAt: new Date().toISOString()
        };
        todos.push(newTodo);
        await writeTodos(todos);
        res.status(201).json(newTodo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create todo' });
    }
});

/**
 * @swagger
 * /todos/{id}:
 *   put:
 *     summary: Update a todo
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The todo id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: The updated todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       404:
 *         description: The todo was not found
 */
app.put('/todos/:id', async (req, res) => {
    try {
        const todos = await readTodos();
        const index = todos.findIndex(t => t.id === parseInt(req.params.id));
        if (index === -1) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        todos[index] = {
            ...todos[index],
            ...req.body,
            id: todos[index].id // Prevent id from being updated
        };
        await writeTodos(todos);
        res.json(todos[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

/**
 * @swagger
 * /todos/{id}:
 *   delete:
 *     summary: Delete a todo
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The todo id
 *     responses:
 *       204:
 *         description: Todo deleted successfully
 *       404:
 *         description: The todo was not found
 */
app.delete('/todos/:id', async (req, res) => {
    try {
        const todos = await readTodos();
        const index = todos.findIndex(t => t.id === parseInt(req.params.id));
        if (index === -1) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        todos.splice(index, 1);
        await writeTodos(todos);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});

// Initialize the data file and start the server
const PORT = process.env.PORT || 3000;
initializeDataFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}); 