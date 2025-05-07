# CRM System

A modern, full-stack Customer Relationship Management (CRM) platform built with React, Vite, Material UI, Tailwind CSS, and Supabase.

## Features

- **Dashboard**: Real-time overview of customer statistics, campaign performance, and activity timeline.
- **Customer Management**: Add, view, and manage customer profiles.
- **Campaigns**: Create and track marketing campaigns.
- **Chat**: Real-time chat functionality for customer support.
- **Workflows**: Automated workflow management.
- **Calendar**: Schedule and view upcoming events.
- **Authentication**: Secure login and registration with JWT.

## B2B Pipeline System

Our CRM includes a powerful B2B pipeline management system designed to streamline your sales process:

### Pipeline Features
- **Visual Deal Pipeline**: Interactive Kanban-style board for tracking deals through different stages
- **Deal Management**: Create, edit, and track deals with detailed information
- **Stage Customization**: Customize pipeline stages to match your sales process
- **Deal Analytics**: Track conversion rates, deal values, and win/loss ratios
- **Activity Tracking**: Log all interactions and activities related to each deal
- **Team Collaboration**: Assign deals to team members and track their progress

### Pipeline Stages
1. **Lead Qualification**
2. **Initial Contact**
3. **Needs Analysis**
4. **Proposal**
5. **Negotiation**
6. **Closed Won/Lost**

### Deal Information
- Deal value and currency
- Expected close date
- Probability of success
- Associated company and contacts
- Activity history
- Notes and attachments
- Custom fields

### Pipeline Analytics
- Stage-wise conversion rates
- Average deal size
- Sales velocity
- Win/loss analysis
- Revenue forecasting
- Team performance metrics

## Images

### Dashboard Overview
![Dashboard Overview](https://i.postimg.cc/vHc8DV2L/Screenshot-2025-05-07-123455.png)
![Dashboard Overview](https://i.postimg.cc/cJqLpLm7/Screenshot-2025-05-07-123653.png)
*Main dashboard showing key metrics and analytics*

### Customer Management
![Customer Management](https://i.postimg.cc/dVZ0Ny8t/Screenshot-2025-05-07-123724.png)
*Customer list and management interface*

### Pipeline View
![Pipeline View](https://i.postimg.cc/FFPs9ZpH/Screenshot-2025-05-07-134547.png)
![Pipeline View](https://i.postimg.cc/ZnDTVbnd/Screenshot-2025-05-07-134600.png)
*B2B pipeline visualization with deal stages*

### Campaign Management
![Campaign Management](https://i.postimg.cc/MGypqJPC/Screenshot-2025-05-07-134420.png)
*Campaign creation and tracking interface*

### Analytics Dashboard
![Analytics Dashboard](https://i.postimg.cc/wvsWMHRk/Screenshot-2025-05-07-142153.png)
*Detailed analytics and reporting view*



*And Much More*


## Tech Stack

- **Frontend**: React, Vite, Material UI, Tailwind CSS, Ant Design
- **Backend**: Express (API), Socket.io
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT
- **Real-time Communication**: Socket.io
- **Charts**: Recharts

## Backend Technologies & Skills

Our backend is built with a robust set of technologies and follows modern development practices:

### Core Technologies
- **Node.js & Express**: Fast, unopinionated web framework for building RESTful APIs
- **Supabase**: Backend-as-a-Service (BaaS) for database and authentication
- **Socket.io**: Real-time, bidirectional communication for chat and notifications

### Security & Authentication
- **JWT (JSON Web Tokens)**: Secure user authentication and authorization
- **Bcrypt**: Password hashing and security
- **CORS**: Cross-Origin Resource Sharing protection

### File Handling & Data Processing
- **Multer**: File upload handling
- **CSV Parse**: CSV file processing and data import
- **Path**: File system path utilities

### Communication Services
- **Nodemailer**: Email service integration
- **Twilio**: SMS and communication services
- **Socket.io**: Real-time event-based communication

### Development Tools
- **Dotenv**: Environment variable management
- **Express Middleware**: Request processing and API security

### API Features
- RESTful API architecture
- Real-time data synchronization
- File upload and processing
- Email and SMS integration
- Secure authentication and authorization
- Cross-origin resource sharing
- Environment-based configuration

## Architecture

The CRM system follows a layered architecture:
- **Client Layer**: React frontend with Material UI and Tailwind CSS.
- **API Layer**: Express backend with JWT authentication and Socket.io for real-time chat.
- **Service Layer**: JWT verification, CSV parsing, workflow engine, and chat service.
- **Data Layer**: Supabase database for storing user, customer, campaign, and chat data.
- **External Services**: Email and SMS services for notifications.

For a detailed architecture diagram, see [crm-architecture-diagram.md](crm-architecture-diagram.md).

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Digvijay2347/B2B-Customer-Relationship-Management-CRM-.git
   cd **folder_created_name**
   ```

2. Install dependencies:
   ```bash
   cd crm1
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:5173) in your browser.

### Available Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build the project for production.
- `npm run lint`: Run ESLint to check for code issues.
- `npm run preview`: Preview the production build locally.

## Folder Structure

- `crm1/`: Main project directory.
  - `src/`: Source code.
    - `components/`: Reusable UI components.
    - `pages/`: Page components.
    - `contexts/`: React context providers.
    - `services/`: API and service functions.
    - `assets/`: Static assets.
  - `public/`: Public assets.
  - `vite.config.js`: Vite configuration.
  - `tailwind.config.js`: Tailwind CSS configuration.
  - `package.json`: Project dependencies and scripts.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. 
