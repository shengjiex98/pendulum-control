# Pendulum Control Demo

A web-based interactive demo of inverted pendulum control using a PD controller.

## Features

- Real-time physics simulation at 60 fps
- Adjustable controller gains (Kₚ, Kᴅ)
- Configurable max torque and control period
- Disturbance input via slider or gamepad
- Force visualization (gravity, drag, control, disturbance)

## Getting Started

```bash
npm install
npm run dev
```

Then open <http://localhost:5173> in your browser.

## Controls

| Parameter | Description |
| --------- | ----------- |
| Disturbance | External torque applied to the pendulum (-1 to 1) |
| Max Torque | Maximum torque the controller can apply (Nm) |
| Gain Kₚ | Proportional gain |
| Gain Kᴅ | Derivative gain |
| Control Period | How often the controller updates (in frames) |

A gamepad can also be used to control the disturbance via the left stick X-axis.

## Acknowledgments

This project is a web port of [PendulumControlDemo.jl](https://github.com/Ratfink/PendulumControlDemo.jl), an interactive pendulum control demo in Julia by Clara Hobbs.

## License

MIT License - see [LICENSE](LICENSE) for details.
