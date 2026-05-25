import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form!: FormGroup;
  loading = false;
  error = '';
  showPass = false;
  year = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // KUNNR: required + min 10 alphanumeric characters
      kunnr: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(10)
        ]
      ],
      // Password: required + min 4 characters
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(4)
        ]
      ]
    });
  }

  get progress(): number {
    const kunnr = this.form.get('kunnr');
    const password = this.form.get('password');
    let value = 0;

    if (kunnr?.dirty || kunnr?.touched) {
      value += 20;
    }
    if (kunnr?.valid) {
      value += 15;
    }
    if (password?.dirty || password?.touched) {
      value += 30;
    }
    if (password?.valid) {
      value += 35;
    }

    return Math.min(100, value);
  }

  get progressMessage(): string {
    if (this.progress === 0) {
      return 'Start by entering your customer ID.';
    }
    if (this.progress <= 35) {
      return 'Great start — just add your password to continue.';
    }
    if (this.progress < 100) {
      return 'Almost there — one more step before signing in.';
    }
    return 'All set. Tap sign in to access your portal.';
  }

  togglePass(): void {
    this.showPass = !this.showPass;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const { kunnr, password } = this.form.value;

    this.authService.login({ kunnr, password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.loading = false;
        this.error = err?.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
