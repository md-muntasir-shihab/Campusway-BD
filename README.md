
# CampusWay

![Build Status](#) ![License](#) <!-- Add real badge URLs if available -->

CampusWay is a full-stack web application for university and campus management.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Contribution](#contribution)
- [Testing](#testing)
- [Demo & Screenshots](#demo--screenshots)
- [Contact](#contact)
- [License](#license)

## Features
- University and resource management
- News publishing and admin workflow
- Exam and subscription modules
- Team access control
- Responsive, user-friendly UI

## Tech Stack
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS
- **Backend:** Express.js, TypeScript
- **Database:** MongoDB (local instance)
- **Authentication:** Firebase Auth
- **Testing:** Jest, Playwright

## Project Structure


```
backend/          # Express.js API server
frontend/         # Vite + React SPA
frontend-next/    # Next.js SSR frontend
admin-dashboard/  # Admin panel UI
news-page/        # News and updates
resources-page/   # Resource management
exams-page/       # Exam management
team-members/     # Team management
universities-page/# University management
```


## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local instance)
- Firebase project (for Auth)

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/md-muntasir-shihab/CWBD-MAIN.git
   cd CWBD-MAIN
   ```
2. Install dependencies for each project:
   ```sh
   cd backend && npm install
   cd ../frontend && npm install
   cd ../frontend-next && npm install
   ```
3. Start MongoDB locally (see `.local-mongo/` or your MongoDB installation)
4. Start backend:
   ```sh
   cd backend && npm run dev
   ```
5. Start frontend:
   ```sh
   cd frontend && npm run dev
   ```
6. (Optional) Start Next.js frontend:
   ```sh
   cd frontend-next && npm run dev
   ```

## Configuration
- Backend: Configure environment variables in `backend/.env` (see sample or docs)
- Frontend: Set Firebase config in `frontend/.env`
- MongoDB: Default is local, can be changed in backend config

## Documentation
- See `AGENTS.md`, `HOME_ADMIN_GUIDE.md`, and `NEWS_ADMIN_GUIDE.md` for detailed guides
- API contracts: `HOME_API_CONTRACT.md`, `NEWS_API_CONTRACT.md`, `API_CONTRACT_SUBSCRIPTION.md`
- QA and test reports: `QA_REPORT.md`, `QA_REPORT_ADMIN_PANEL.md`, etc.

## Contribution
Contributions are welcome! Please open an issue or pull request.
1. Fork the repo
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a pull request

## Testing
- **Backend:**
  ```sh
  cd backend
  npm run test
  ```
- **Frontend:**
  ```sh
  cd frontend
  npm run e2e
  ```

## Demo & Screenshots
- [Live Demo](#) <!-- Add your deployed site link here -->
- ![Screenshot](docs/architecture/sample-screenshot.png) <!-- Replace with real screenshot path -->

## Contact
- Author: Muntasir Shihab
- Email: [your-email@example.com](mailto:your-email@example.com)
- GitHub: [md-muntasir-shihab](https://github.com/md-muntasir-shihab)

## License
This project is for educational and demonstration purposes.

## Documentation
- See `AGENTS.md`, `HOME_ADMIN_GUIDE.md`, and `NEWS_ADMIN_GUIDE.md` for detailed guides
- API contracts: `HOME_API_CONTRACT.md`, `NEWS_API_CONTRACT.md`, `API_CONTRACT_SUBSCRIPTION.md`
- QA and test reports: `QA_REPORT.md`, `QA_REPORT_ADMIN_PANEL.md`, etc.

## License
This project is for educational and demonstration purposes.
